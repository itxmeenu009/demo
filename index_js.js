import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAdNveufVtGigrESLQPOGIH-ET--gIkFxw",
    authDomain: "today-blog-b3f52.firebaseapp.com",
    projectId: "today-blog-b3f52",
    storageBucket: "today-blog-b3f52.firebasestorage.app",
    messagingSenderId: "81562141656",
    appId: "1:81562141656:web:02fdc95ceed61d954c28ad",
    measurementId: "G-FKEPZ67JSL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAILS = ["su92-bssem-f24-186@superior.edu.pk", "todaysblog3@gmail.com"];

// Modal Handling
const loginModal = document.getElementById('loginModal');
document.getElementById('loginOpenBtn').onclick = () => loginModal.style.display = 'block';
document.getElementById('closeModalBtn').onclick = () => loginModal.style.display = 'none';

window.handleLogin = async () => {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    try {
        if(!ADMIN_EMAILS.includes(email)) throw new Error("Not Authorized");
        await signInWithEmailAndPassword(auth, email, pass);
        loginModal.style.display = 'none';
    } catch (err) { alert("Login Failed: " + err.message); }
};

window.handleLogout = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    const isAdmin = user && ADMIN_EMAILS.includes(user.email);
    document.getElementById('adminPosting').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('logoutBtn').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('loginOpenBtn').style.display = isAdmin ? 'none' : 'block';
});

// Post Submission
window.submitPost = async () => {
    const title = document.getElementById('postTitle').value;
    const img = document.getElementById('postImageUrl').value;
    const txt = document.getElementById('postText').value;
    const author = document.getElementById('postAuthorName').value || "Admin";

    if(!title || !txt) return alert("Fill required fields");

    try {
        await addDoc(collection(db, "posts"), {
            title, imageUrl: img, content: txt, author,
            likes: 0, dislikes: 0, timestamp: serverTimestamp()
        });
        alert("Post Uploaded!");
        document.getElementById('postTitle').value = '';
        document.getElementById('postText').value = '';
        document.getElementById('postImageUrl').value = '';
    } catch (err) { alert(err.message); }
};

// Real-time Feed
const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
onSnapshot(q, (snap) => {
    const feed = document.getElementById('postsFeed');
    feed.innerHTML = '';
    
    snap.forEach(docSnap => {
        const post = docSnap.data();
        const id = docSnap.id;
        const hasLiked = localStorage.getItem(`liked-${id}`);
        const hasDisliked = localStorage.getItem(`disliked-${id}`);

        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
            ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image">` : ''} 
            <div class="post-content">
                <small>By ${post.author} | ${post.timestamp?.toDate().toLocaleDateString() || 'Just now'}</small>
                <h3>${post.title}</h3>
                <p class="post-text" id="text-${id}">${post.content}</p>
                <button class="read-more-btn" id="btn-${id}" onclick="toggleReadMore('${id}')">Read More...</button>
            </div>
            <div class="actions-container">
                <button class="like-btn" id="l-btn-${id}" ${hasLiked ? 'disabled style="opacity:0.5"' : ''} onclick="handleLike('${id}')">
                    <i class="ri-thumb-up-line"></i> ${post.likes || 0}
                </button>
                <button class="dislike-btn" id="d-btn-${id}" ${hasDisliked ? 'disabled style="opacity:0.5"' : ''} onclick="handleDislike('${id}')">
                    <i class="ri-thumb-down-line"></i> ${post.dislikes || 0}
                </button>
            </div>
        `;
        feed.appendChild(card);
    });
});

window.handleLike = async (id) => {
    if (localStorage.getItem(`liked-${id}`)) return;
    try {
        await updateDoc(doc(db, "posts", id), { likes: increment(1) });
        localStorage.setItem(`liked-${id}`, "true");
    } catch (err) { console.error(err); }
};

window.handleDislike = async (id) => {
    if (localStorage.getItem(`disliked-${id}`)) return;
    try {
        await updateDoc(doc(db, "posts", id), { dislikes: increment(1) });
        localStorage.setItem(`disliked-${id}`, "true");
    } catch (err) { console.error(err); }
};

window.submitFeedback = async () => {
    const name = document.getElementById('fbName').value.trim();
    const email = document.getElementById('fbEmail').value.trim();
    const msg = document.getElementById('fbMessage').value.trim();
    
    // Validation
    if (!name) {
        alert("Please enter your name!");
        return;
    }
    if (!email) {
        alert("Please enter your email!");
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Please enter a valid email address!");
        return;
    }
    if (!msg) {
        alert("Please enter your message!");
        return;
    }
    
    try {
        await addDoc(collection(db, "feedback"), { name, email, msg, timestamp: serverTimestamp() });
        
        // Clear form fields
        document.getElementById('fbName').value = '';
        document.getElementById('fbEmail').value = '';
        document.getElementById('fbMessage').value = '';
        
        // Show success message
        const statusDiv = document.getElementById('fbStatus');
        statusDiv.innerHTML = '<p style="color: green; font-weight: bold;">✓ Message sent successfully!</p>';
        statusDiv.style.display = 'block';
        
        // Hide success message after 5 seconds
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
        
    } catch (error) {
        document.getElementById('fbStatus').innerHTML = '<p style="color: red; font-weight: bold;">✗ Error sending message. Please try again.</p>';
        document.getElementById('fbStatus').style.display = 'block';
    }
};

window.toggleReadMore = (id) => {
    const p = document.getElementById(`text-${id}`);
    const b = document.getElementById(`btn-${id}`);
    p.classList.toggle('expanded');
    b.innerText = p.classList.contains('expanded') ? "Show Less" : "Read More...";
};