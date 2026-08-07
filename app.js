import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";


/* =========================
   INITIALISATION
========================= */

const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);


/* =========================
   VARIABLES
========================= */

let currentUser = null;
let currentUserData = null;

const ADMIN_CODE = "7771";


/* =========================
   OUTILS
========================= */

function $(id) {
  return document.getElementById(id);
}

function showMessage(id, text, type = "") {
  const element = $(id);

  if (!element) return;

  element.textContent = text;
  element.className = "message " + type;
}


/* =========================
   NAVIGATION
========================= */

function showSection(sectionId) {

  document.querySelectorAll(".section").forEach(section => {
    section.classList.add("hidden");
  });

  const section = $(sectionId);

  if (section) {
    section.classList.remove("hidden");
  }

  document.querySelectorAll(".bottom-nav button").forEach(button => {
    button.classList.remove("active");

    if (button.dataset.section === sectionId) {
      button.classList.add("active");
    }
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


document.querySelectorAll(".bottom-nav button").forEach(button => {

  button.addEventListener("click", () => {

    showSection(button.dataset.section);

  });

});


/* =========================
   BOUTONS SERVICES
========================= */

document.querySelectorAll(".service-button").forEach(button => {

  button.addEventListener("click", () => {

    const service = button.dataset.service;

    if (service === "data") {
      showSection("dataSection");
    }

    if (service === "trial") {
      showSection("trialSection");
    }

    if (service === "social") {
      showSection("socialSection");
      loadPosts();
    }

  });

});


/* =========================
   COMPTE
========================= */

$("registerButton")?.addEventListener("click", () => {

  $("registerModal").classList.remove("hidden");

});


$("closeRegister")?.addEventListener("click", () => {

  $("registerModal").classList.add("hidden");

});


$("loginButton")?.addEventListener("click", loginUser);


async function loginUser() {

  const phone = $("loginPhone").value.trim();
  const password = $("loginPassword").value;

  if (!phone || !password) {

    showMessage(
      "authMessage",
      "Veuillez remplir tous les champs.",
      "error"
    );

    return;
  }

  try {

    /*
      Firebase Auth utilise une adresse email.
      Pour garder une connexion simple avec un numéro,
      nous transformons le numéro en identifiant interne.
    */

    const email = normalizePhone(phone);

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    showMessage(
      "authMessage",
      "Connexion réussie.",
      "success"
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "authMessage",
      "Connexion impossible. Vérifie tes informations.",
      "error"
    );

  }

}


/* =========================
   INSCRIPTION
========================= */

$("createAccountButton")?.addEventListener(
  "click",
  registerUser
);


async function registerUser() {

  const name = $("registerName").value.trim();
  const phone = $("registerPhone").value.trim();
  const password = $("registerPassword").value;

  if (!name || !phone || !password) {

    showMessage(
      "registerMessage",
      "Remplis tous les champs.",
      "error"
    );

    return;
  }

  if (password.length < 6) {

    showMessage(
      "registerMessage",
      "Le mot de passe doit contenir au moins 6 caractères.",
      "error"
    );

    return;
  }

  try {

    const email = normalizePhone(phone);

    const result =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = result.user;

    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        name: name,
        phone: phone,
        balance: 0,
        createdAt: serverTimestamp()
      }
    );

    $("registerModal").classList.add("hidden");

    showMessage(
      "authMessage",
      "Compte créé avec succès.",
      "success"
    );

  } catch (error) {

    console.error(error);

    let message =
      "Impossible de créer le compte.";

    if (error.code === "auth/email-already-in-use") {
      message = "Ce numéro possède déjà un compte.";
    }

    if (error.code === "auth/weak-password") {
      message = "Mot de passe trop faible.";
    }

    showMessage(
      "registerMessage",
      message,
      "error"
    );

  }

}


/* =========================
   NUMÉRO → EMAIL INTERNE
========================= */

function normalizePhone(phone) {

  let clean =
    phone.replace(/[^\d+]/g, "");

  clean = clean.replace(/\+/g, "");

  return clean + "@4xdata.local";

}


/* =========================
   ÉTAT DE CONNEXION
========================= */

onAuthStateChanged(auth, async user => {

  currentUser = user;

  if (!user) {

    currentUserData = null;

    $("loggedOut")?.classList.remove("hidden");
    $("loggedIn")?.classList.add("hidden");

    return;
  }

  await loadCurrentUser();

});


/* =========================
   CHARGER UTILISATEUR
========================= */

async function loadCurrentUser() {

  if (!currentUser) return;

  try {

    const userRef =
      doc(db, "users", currentUser.uid);

    const snapshot =
      await getDoc(userRef);

    if (snapshot.exists()) {

      currentUserData = snapshot.data();

      displayUser();

    }

  } catch (error) {

    console.error(error);

  }

}


function displayUser() {

  $("loggedOut")?.classList.add("hidden");
  $("loggedIn")?.classList.remove("hidden");

  if (!currentUserData) return;

  $("userName").textContent =
    currentUserData.name || "Utilisateur";

  $("userPhone").textContent =
    currentUserData.phone || "";

  $("userBalance").textContent =
    Number(currentUserData.balance || 0)
      .toLocaleString("fr-FR") + " FCFA";

}


/* =========================
   DÉCONNEXION
========================= */

$("logoutButton")?.addEventListener(
  "click",
  async () => {

    await signOut(auth);

  }
);


/* =========================
   PUBLICATION
========================= */

$("publishButton")?.addEventListener(
  "click",
  publishPost
);


async function publishPost() {

  if (!currentUser) {

    showMessage(
      "postMessage",
      "Connecte-toi pour publier.",
      "error"
    );

    return;
  }

  const content =
    $("postContent").value.trim();

  if (!content) {

    showMessage(
      "postMessage",
      "Écris quelque chose avant de publier.",
      "error"
    );

    return;
  }

  try {

    await addDoc(
      collection(db, "posts"),
      {
        uid: currentUser.uid,
        name: currentUserData?.name || "Utilisateur",
        content: content,
        createdAt: serverTimestamp()
      }
    );

    $("postContent").value = "";

    showMessage(
      "postMessage",
      "Publication créée.",
      "success"
    );

    await loadPosts();

  } catch (error) {

    console.error(error);

    showMessage(
      "postMessage",
      "Impossible de publier.",
      "error"
    );

  }

}


/* =========================
   CHARGER PUBLICATIONS
========================= */

async function loadPosts() {

  const container =
    $("postsContainer");

  if (!container) return;

  container.innerHTML =
    "<div class='empty-state'>Chargement...</div>";

  try {

    const postsQuery =
      query(
        collection(db, "posts"),
        orderBy("createdAt", "desc")
      );

    const snapshot =
      await getDocs(postsQuery);

    if (snapshot.empty) {

      container.innerHTML =
        "<div class='empty-state'>Aucune publication pour le moment.</div>";

      updateAdminStats();

      return;
    }

    container.innerHTML = "";

    snapshot.forEach(postDoc => {

      const post =
        postDoc.data();

      const article =
        document.createElement("article");

      article.className = "post";

      const date =
        post.createdAt?.toDate
          ? post.createdAt.toDate().toLocaleString("fr-FR")
          : "À l'instant";

      article.innerHTML = `
        <div class="post-header">
          <div class="post-avatar">👤</div>

          <div>
            <div class="post-name">
              ${escapeHTML(post.name || "Utilisateur")}
            </div>

            <span class="post-date">
              ${escapeHTML(date)}
            </span>
          </div>
        </div>

        <div class="post-text">
          ${escapeHTML(post.content || "")}
        </div>
      `;

      container.appendChild(article);

    });

    updateAdminStats();

  } catch (error) {

    console.error(error);

    container.innerHTML =
      "<div class='empty-state'>Impossible de charger les publications.</div>";

  }

}


/* =========================
   SÉCURITÉ AFFICHAGE
========================= */

function escapeHTML(value) {

  const div =
    document.createElement("div");

  div.textContent =
    String(value);

  return div.innerHTML;

}


/* =========================
   ESSAI 39H
========================= */

$("activateTrialButton")?.addEventListener(
  "click",
  activateTrial
);


async function activateTrial() {

  if (!currentUser) {

    showMessage(
      "trialMessage",
      "Connecte-toi avant d'activer ton essai.",
      "error"
    );

    return;
  }

  try {

    const userRef =
      doc(db, "users", currentUser.uid);

    const snapshot =
      await getDoc(userRef);

    if (!snapshot.exists()) return;

    const data =
      snapshot.data();

    if (data.trialStart) {

      const start =
        data.trialStart.toDate
          ? data.trialStart.toDate()
          : new Date(data.trialStart);

      const end =
        new Date(
          start.getTime() +
          39 * 60 * 60 * 1000
        );

      if (new Date() < end) {

        showTrialCountdown(end);

        return;
      }

    }

    const startDate = new Date();

    await updateDoc(
      userRef,
      {
        trialStart: startDate,
        trialActive: true
      }
    );

    showTrialCountdown(
      new Date(
        startDate.getTime() +
        39 * 60 * 60 * 1000
      )
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "trialMessage",
      "Impossible d'activer l'essai.",
      "error"
    );

  }

}


function showTrialCountdown(endDate) {

  $("trialStatus").classList.add("active");

  function update() {

    const remaining =
      endDate.getTime() -
      Date.now();

    if (remaining <= 0) {

      $("trialStatus").textContent =
        "⛔ Essai terminé";

      $("trialStatus").classList.remove("active");

      return;
    }

    const hours =
      Math.floor(
        remaining /
        (1000 * 60 * 60)
      );

    const minutes =
      Math.floor(
        (remaining %
          (1000 * 60 * 60)) /
        (1000 * 60)
      );

    const seconds =
      Math.floor(
        (remaining %
          (1000 * 60)) /
        1000
      );

    $("trialStatus").textContent =
      `✅ Essai actif : ${hours}h ${minutes}min ${seconds}s`;
  }

  update();

  setInterval(update, 1000);
}


/* =========================
   ADMIN
========================= */

$("adminButton")?.addEventListener(
  "click",
  () => {

    showSection("adminSection");

  }
);


$("adminLoginButton")?.addEventListener(
  "click",
  adminLogin
);


function adminLogin() {

  const code =
    $("adminCode").value.trim();

  if (code === ADMIN_CODE) {

    $("adminLogin").classList.add("hidden");

    $("adminDashboard").classList.remove("hidden");

    showMessage(
      "adminLoginMessage",
      "",
      ""
    );

    updateAdminStats();

  } else {

    showMessage(
      "adminLoginMessage",
      "❌ Code administrateur incorrect.",
      "error"
    );

  }

}


$("adminLogoutButton")?.addEventListener(
  "click",
  () => {

    $("adminDashboard").classList.add("hidden");

    $("adminLogin").classList.remove("hidden");

    $("adminCode").value = "";

  }
);


/* =========================
   STATS ADMIN
========================= */

async function updateAdminStats() {

  try {

    const usersSnapshot =
      await getDocs(
        collection(db, "users")
      );

    const postsSnapshot =
      await getDocs(
        collection(db, "posts")
      );

    $("totalUsers").textContent =
      usersSnapshot.size;

    $("totalPosts").textContent =
      postsSnapshot.size;

    $("totalTransactions").textContent =
      0;

    let totalBalance = 0;

    usersSnapshot.forEach(item => {

      const data =
        item.data();

      totalBalance +=
        Number(data.balance || 0);

    });

    $("adminBalance").textContent =
      totalBalance.toLocaleString("fr-FR")
      + " FCFA";

  } catch (error) {

    console.error(error);

  }

}


/* =========================
   RETRAIT
========================= */

$("withdrawButton")?.addEventListener(
  "click",
  () => {

    $("withdrawModal").classList.remove(
      "hidden"
    );

  }
);


$("closeWithdraw")?.addEventListener(
  "click",
  () => {

    $("withdrawModal").classList.add(
      "hidden"
    );

  }
);


$("confirmWithdraw")?.addEventListener(
  "click",
  async () => {

    const amount =
      Number(
        $("withdrawAmount").value
      );

    const number =
      $("withdrawNumber").value.trim();

    if (!amount || amount <= 0 || !number) {

      showMessage(
        "withdrawMessage",
        "Remplis correctement les informations.",
        "error"
      );

      return;
    }

    try {

      await addDoc(
        collection(db, "withdrawals"),
        {
          amount: amount,
          number: number,
          uid: currentUser?.uid || null,
          status: "pending",
          createdAt: serverTimestamp()
        }
      );

      showMessage(
        "withdrawMessage",
        "Demande de retrait enregistrée.",
        "success"
      );

      $("withdrawAmount").value = "";
      $("withdrawNumber").value = "";

    } catch (error) {

      console.error(error);

      showMessage(
        "withdrawMessage",
        "Impossible d'enregistrer la demande.",
        "error"
      );

    }

  }
);


/* =========================
   DATA
========================= */

$("dataOfferButton")?.addEventListener(
  "click",
  () => {

    showMessage(
      "dataMessage",
      "Les offres DATA seront configurées avec le fournisseur/opérateur concerné.",
      ""
    );

  }
);


/* =========================
   STATISTIQUES ADMIN
========================= */

$("adminUsersButton")?.addEventListener(
  "click",
  async () => {

    $("adminContent").innerHTML = `
      <h3>👥 Utilisateurs</h3>
      <p>Chargement...</p>
    `;

    try {

      const snapshot =
        await getDocs(
          collection(db, "users")
        );

      let html = "";

      if (snapshot.empty) {

        html =
          "<p>Aucun utilisateur.</p>";

      } else {

        snapshot.forEach(item => {

          const data =
            item.data();

          html += `
            <div class="post">
              <strong>
                ${escapeHTML(data.name || "Utilisateur")}
              </strong>

              <p>
                ${escapeHTML(data.phone || "")}
              </p>

              <small>
                Solde :
                ${Number(data.balance || 0)
                  .toLocaleString("fr-FR")}
                FCFA
              </small>
            </div>
          `;

        });

      }

      $("adminContent").innerHTML =
        `<h3>👥 Utilisateurs</h3>${html}`;

    } catch (error) {

      console.error(error);

      $("adminContent").innerHTML =
        "<p>Erreur lors du chargement.</p>";

    }

  }
);


$("adminPostsButton")?.addEventListener(
  "click",
  async () => {

    await loadPosts();

    $("adminContent").innerHTML = `
      <h3>📰 Publications</h3>
      <p>
        Les publications sont visibles dans
        la section Réseau social.
      </p>
    `;

  }
);


$("adminTransactionsButton")?.addEventListener(
  "click",
  async () => {

    $("adminContent").innerHTML = `
      <h3>💳 Transactions</h3>
      <p>Chargement...</p>
    `;

    try {

      const snapshot =
        await getDocs(
          collection(db, "withdrawals")
        );

      let html = "";

      if (snapshot.empty) {

        html =
          "<p>Aucune demande de retrait.</p>";

      } else {

        snapshot.forEach(item => {

          const data =
            item.data();

          html += `
            <div class="post">
              <strong>
                ${Number(data.amount || 0)
                  .toLocaleString("fr-FR")}
                FCFA
              </strong>

              <p>
                📱 ${escapeHTML(data.number || "")}
              </p>

              <small>
                Statut :
                ${escapeHTML(data.status || "pending")}
              </small>
            </div>
          `;

        });

      }

      $("adminContent").innerHTML =
        `<h3>💳 Transactions</h3>${html}`;

    } catch (error) {

      console.error(error);

      $("adminContent").innerHTML =
        "<p>Erreur lors du chargement.</p>";

    }

  }
);


/* =========================
   ACCUEIL
========================= */

$("startButton")?.addEventListener(
  "click",
  () => {

    showSection("socialSection");

    loadPosts();

  }
);


/* =========================
   CHARGEMENT INITIAL
========================= */

showSection("homeSection");

loadPosts();
