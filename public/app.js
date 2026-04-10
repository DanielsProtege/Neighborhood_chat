document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const nicknameModal = document.getElementById('nickname-modal');
    const nicknameForm = document.getElementById('nickname-form');
    const nicknameInput = document.getElementById('nickname-input');
    
    const locationModal = document.getElementById('location-modal');
    const locationStatus = document.getElementById('location-status');
    const neighborhoodLabel = document.getElementById('neighborhood-label');
    const userNicknameDisplay = document.getElementById('user-nickname');
    
    const chatFeed = document.getElementById('chat-feed');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');

    // State
    let currentUserNickname = localStorage.getItem('neighborhood_nickname');
    let currentNeighborhood = null;
    let socket = null;

    // --- 1. Initialization ---
    if (!currentUserNickname) {
        // Show modal and wait for input
        nicknameModal.classList.remove('hidden');
        
        nicknameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = nicknameInput.value.trim();
            if (val) {
                currentUserNickname = val;
                localStorage.setItem('neighborhood_nickname', currentUserNickname);
                userNicknameDisplay.textContent = currentUserNickname;
                nicknameModal.classList.add('hidden');
                initGeolocation();
            }
        });
    } else {
        userNicknameDisplay.textContent = currentUserNickname;
        initGeolocation();
    }

    // --- 2. Auto-expand Textarea ---
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if(this.value === '') {
            this.style.height = '48px';
        }
    });

    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });

    // --- 3. Geolocation ---
    function initGeolocation() {
        locationModal.classList.remove('hidden');
        
        if (!navigator.geolocation) {
            handleLocationError('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(2);
                const lng = position.coords.longitude.toFixed(2);
                currentNeighborhood = `${lat},${lng}`;
                
                neighborhoodLabel.textContent = `Grid: ${currentNeighborhood}`;
                locationModal.classList.add('hidden');
                
                initChat();
            },
            (error) => {
                console.error(error);
                let message = 'Unable to retrieve your location.';
                if (error.code === 1) message = 'Location access denied.';
                handleLocationError(message);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
    }

    function handleLocationError(message) {
        locationStatus.textContent = message;
        locationStatus.classList.remove('animate-pulse');
        locationStatus.classList.add('text-red-500');
        document.getElementById('location-spinner').classList.add('hidden');
        
        // Fallback or retry logic can go here. For now, we drop into a global room if failed.
        setTimeout(() => {
            currentNeighborhood = 'Global';
            neighborhoodLabel.textContent = currentNeighborhood;
            locationModal.classList.add('hidden');
            initChat();
        }, 3000);
    }

    // --- 4. Chat logic ---
    function initChat() {
        socket = io();

        socket.on('connect', () => {
            console.log('Connected to server');
            socket.emit('join_neighborhood', currentNeighborhood);
        });

        socket.on('chat_history', (history) => {
            chatFeed.innerHTML = ''; // Clear feed
            history.forEach(msg => appendMessage(msg, false));
            scrollToBottom();
        });

        socket.on('chat_message', (msg) => {
            appendMessage(msg, true);
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }

    // --- 5. Message form ---
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text || !socket) return;

        const msgData = {
            nickname: currentUserNickname,
            neighborhood: currentNeighborhood,
            text: text
            // Timestamp is added on server side
        };

        socket.emit('chat_message', msgData);
        chatInput.value = '';
        chatInput.style.height = '48px';
        chatInput.focus();
    });

    // --- 6. Rendering ---
    function appendMessage(msg, animate) {
        const isMine = msg.nickname === currentUserNickname;
        
        // Format time
        const date = new Date(msg.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const wrapper = document.createElement('div');
        wrapper.className = `flex w-full ${isMine ? 'justify-end' : 'justify-start'}`;

        const bubble = document.createElement('div');
        bubble.className = `max-w-[85%] sm:max-w-md flex flex-col ${animate ? 'message-bubble' : ''}`;
        
        let innerHTML = '';
        
        if (isMine) {
            innerHTML = `
                <div class="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
                    <p class="text-sm whitespace-pre-wrap break-words">${escapeHTML(msg.text)}</p>
                </div>
                <div class="text-[10px] text-gray-400 mt-1 text-right px-1">
                    ${timeStr}
                </div>
            `;
        } else {
            innerHTML = `
                <div class="text-[11px] text-gray-500 mb-1 px-1 flex items-center gap-1">
                    <span class="font-semibold text-gray-700">${escapeHTML(msg.nickname)}</span>
                </div>
                <div class="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                    <p class="text-sm whitespace-pre-wrap break-words">${escapeHTML(msg.text)}</p>
                </div>
                <div class="text-[10px] text-gray-400 mt-1 text-left px-1">
                    ${timeStr}
                </div>
            `;
        }

        bubble.innerHTML = innerHTML;
        wrapper.appendChild(bubble);
        chatFeed.appendChild(wrapper);
        
        scrollToBottom();
    }

    function scrollToBottom() {
        // smooth scroll
        chatFeed.scrollTo({
            top: chatFeed.scrollHeight,
            behavior: 'smooth'
        });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }
});
