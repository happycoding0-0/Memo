document.addEventListener('DOMContentLoaded', () => {
    loadMemos();
    
    document.getElementById('memoInput').addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            mineBlock();
        }
    });

    // Make the header dot blink smoothly
    const dot = document.querySelector('.status-dot');
    setInterval(() => {
        dot.style.opacity = dot.style.opacity === '1' ? '0.3' : '1';
        dot.style.transition = 'opacity 0.8s ease-in-out';
    }, 1000);
});

async function mineBlock() {
    const inputElement = document.getElementById('memoInput');
    const content = inputElement.value.trim();
    
    if (!content) {
        alert('Please enter a memo.');
        inputElement.focus();
        return;
    }

    const btn = document.getElementById('saveBtn');
    const miningStatus = document.getElementById('miningStatus');
    
    try {
        btn.disabled = true;
        btn.innerHTML = 'Saving...';
        miningStatus.classList.remove('hidden');
        
        await new Promise(r => setTimeout(r, 600));

        const response = await fetch('/memos', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) throw new Error('Failed to save memo to chain.');

        inputElement.value = '';
        await loadMemos();
    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        btn.innerHTML = 'Save Memo';
        btn.disabled = false;
        miningStatus.classList.add('hidden');
    }
}

async function loadMemos() {
    try {
        const res = await fetch('/memos');
        if (!res.ok) throw new Error('Failed to synchronize chains.');
        
        const data = await res.json();
        renderMemos(data);
    } catch(error) {
        console.error(error);
    }
}

function renderMemos(blocks) {
    const list = document.getElementById('memoList');
    
    if (blocks.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; color: var(--text-muted); padding: 40px; margin: 0 auto;">
                No memos chained yet.
            </div>
        `;
        return;
    }

    list.innerHTML = blocks.map(block => {
        const escapedContent = block.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // Keep hashes short to not clutter the clean UI
        const shortHash = block.hash.substring(0, 16) + '...';
        const shortPrev = block.previous_hash.substring(0, 16) + '...';
        
        // Clean date format
        const dateObj = new Date(block.timestamp);
        const dateOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const cleanDate = dateObj.toLocaleDateString(undefined, dateOptions);

        return `
            <div class="block-card" id="block-${block.id}">
                <div class="block-header">
                    <span class="block-id">Block ${block.id}</span>
                    <span class="block-timestamp">${cleanDate}</span>
                </div>
                
                <div class="block-content">${escapedContent}</div>

                <div class="hash-section">
                    <div class="hash-row prev-hash">
                        <span class="hash-label">Prev</span>
                        <span class="hash-value" title="${block.previous_hash}">${shortPrev}</span>
                    </div>
                    <div class="hash-row cur-hash">
                        <span class="hash-label">Hash</span>
                        <span class="hash-value" title="${block.hash}">${shortHash}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Smooth horizontal scroll to the newest (last) element
    const scrollContainer = document.getElementById('scrollContainer');
    if (scrollContainer) {
        setTimeout(() => {
            scrollContainer.scrollTo({
                left: scrollContainer.scrollWidth,
                behavior: 'smooth'
            });
        }, 50);
    }
}
