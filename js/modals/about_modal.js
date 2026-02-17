import { registerModal, closeTopModal } from '../ui.js';
import { StellarNavigator } from '../ui/StellarNavigator.js';

const SLIDES = [
        {
            title: "GoldFin Kitchen",
            desc: "The comprehensive proposal and contract system designed specifically for culinary professionals and chefs.",
            icon: "🧑‍🍳"
        },
        {
            title: "Streamlined Workflow",
            desc: "Create detailed events, build multi-option proposals, and generate client-ready contracts in minutes.",
            icon: "📝"
        },
        {
            title: "Visual Planning",
            desc: "Keep track of your schedule with an intelligent Dashboard and a drag-and-drop Calendar view.",
            icon: "📅"
        },
        {
            title: "Asset Libraries",
            desc: "Manage your Menu Items, Services, Dietary Tags, and Client list in a centralized repository.",
            icon: "📚"
        },
        {
            title: "Local & Cloud",
            desc: "Works completely offline. Optional Cloud Sync lets you bring your own Firebase backend for multi-device access.",
            icon: "☁️"
        }
    ];

let navigatorInstance = null;

export function showAboutModal() {
    // 1. Inject HTML if not present
    if (!document.getElementById('about-modal')) {
        const modalHTML = `
        <div id="about-modal" class="modal">
            <div class="modal-content">
                <span id="close-about-modal" class="close-modal">&times;</span>
                <h2 style="text-align:center; margin-bottom: 20px; font-family: 'Orbitron', sans-serif; color: #aee1f9; text-shadow: 0 0 10px #6c3fd1;">GoldFin</h2>
                
                <div id="carousel-container">
                    <div id="stellar-carousel"></div>
                    
                    <div id="carousel-controls">
                        <button class="nav-btn" id="prev-btn">‹</button>
                        <button class="nav-btn" id="next-btn">›</button>
                    </div>
                    <div id="dot-nav"></div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // 2. DOM Elements
    const modal = document.getElementById('about-modal');
    const closeBtn = document.getElementById('close-about-modal');

    // 3. Helper Functions
    function closeModal() {
        modal.classList.add('hidden');
    }

    // 4. Event Listeners
    closeBtn.onclick = closeModal;
    
    // Close on outside click
    // Note: This overrides other modal window.onclick handlers while active
    window.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };

    // 5. Show the modal
    modal.classList.remove('hidden');

    // 6. Initialize Navigator
    if (!navigatorInstance) {
        const carouselEl = document.getElementById("stellar-carousel");
        const dotNavEl = document.getElementById("dot-nav");
        const prevBtn = document.getElementById("prev-btn");
        const nextBtn = document.getElementById("next-btn");
        
        if (carouselEl) {
             navigatorInstance = new StellarNavigator(SLIDES, carouselEl, dotNavEl, { prev: prevBtn, next: nextBtn });
        }
    } else {
        navigatorInstance.update();
    }
}