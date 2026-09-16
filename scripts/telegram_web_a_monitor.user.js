// ==UserScript==
// @name         Telegram Web A - SCM Urgent Monitor (KRC, ABA, DC)
// @namespace    https://app-scm.kfm.vn/
// @version      1.0
// @description  Giám sát tin nhắn khẩn cấp (chuyển, vượt sức, giao sai, giao nhầm, điều chuyển, @nynguyen09) trong các group KRC, ABA, DC trên Telegram Web A (https://web.telegram.org/a/)
// @author       KFM - SCM Team
// @match        https://web.telegram.org/a/*
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    console.log('[SCM Telegram Monitor] Đã kích hoạt trên Telegram Web A');

    const URGENT_KEYWORDS = [
        'điều chuyển',
        'vượt sức',
        'giao nhầm',
        'giao sai',
        'chuyển',
        '@nynguyen09',
        '@@nynguyen09'
    ];

    function checkUrgent(text) {
        if (!text) return { isUrgent: false, matched: [] };
        const lower = text.toLowerCase();
        const matched = [];
        if (lower.includes('@nynguyen09') || lower.includes('@@nynguyen09')) {
            matched.push('@nynguyen09');
        }
        ['điều chuyển', 'vượt sức', 'giao nhầm', 'giao sai', 'chuyển'].forEach(kw => {
            if (lower.includes(kw) && !matched.includes(kw)) {
                matched.push(kw);
            }
        });
        return { isUrgent: matched.length > 0, matched };
    }

    // Lắng nghe thay đổi tin nhắn mới trên giao diện Web A
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const messageTextEl = node.querySelector('.text-content') || node.querySelector('.message-text');
                    if (messageTextEl) {
                        const content = messageTextEl.innerText || '';
                        const check = checkUrgent(content);
                        if (check.isUrgent) {
                            console.warn('[🚨 TIN KHẨN CẤP PHÁT HIỆN]:', check.matched, content);
                            // Highlight viền đỏ trên giao diện Telegram Web A
                            node.style.border = '2px solid #ef4444';
                            node.style.borderRadius = '8px';
                            node.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                            
                            // Browser notification
                            if (Notification.permission === 'granted') {
                                new Notification(`🚨 SCM Khẩn Cấp: ${check.matched.join(', ')}`, {
                                    body: content.substring(0, 120) + '...',
                                    icon: 'https://app-scm.kfm.vn/rau-cu-kfm/media/logo.png'
                                });
                            }
                        }
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
})();
