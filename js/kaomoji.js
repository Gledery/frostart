/* =========================================
   kaomoji.js  —  角落颜文字（移植自 PhasWer corner-kaomoji）
   改造点：
   1. 暴露 initKaomoji() / destroyKaomoji() 供开关控制（Frostart 设置）
   2. 移除了原 pageWelcome（PhasWer 子页面欢迎语），Frostart 只有一个页面
   3. 文案适配 Frostart 语境
   4. 幂等：重复调用 initKaomoji 不会创建多个实例
   ========================================= */

const KaomojiWidget = (function () {
    const defaultFace = '(・ω・)';

    const facesEarly = [
        '(・ω・)', '(≧▽≦)', '(ノ´▽`)ノ♪', '(￣▽￣)~*',
        '(・∀・)', '(ﾟ∀ﾟ)', '(*´▽`*)', '(*´∇`*)',
        '(≧∇≦)b', '(・ω・)ノ', '(o´ω`o)ﾉ', '(。・▽・。)'
    ];
    const facesMid = [
        '(。・ω・。)', '(´・ω・`)', '(｀・ω・´)', '(〃￣︶￣)人(￣︶￣〃)',
        '(─▽─)', '(´-ω-`)', '(￣ω￣)'
    ];
    const facesLate = [
        '(Ｔ▽Ｔ)', '(つд⊂)', '(。_。)', '(・_・)',
        '(　´_ゝ`)', '( ˘ω˘ )', '(－ω－)'
    ];

    const messagesEarly = [
        '你在看我吗？',
        '你发现我了！',
        '你点到我了，恭喜',
        '我在这待好久了...',
        '今天也要加油啊awa',
        '要不要去喝杯水',
        '你能陪我一下吗',
        '你是不是在摸鱼',
        '我偷偷观察你很久了',
        '你是怎么发现我的',
        '我好像被你点醒了',
        '嘿嘿，被你抓到了~',
        '(*/ω\\*) 别...别一直盯着我看啦...',
        '你好呀~今天过得怎么样？',
        '你每点我一下，我就开心一点',
        '偷偷告诉你，其实我很期待你来的',
        '鸢说让我好好看着这个项目...',
        '我在努力当一只合格的Kaomoji！',
        '你的鼠标好好玩，我能碰一下吗',
    ];
    const messagesMid = [
        '别点了别点了...',
        '我只是一个无辜的颜文字',
        '你是不是闲得慌',
        '你的鼠标还好吗',
        '我要被你点坏了',
        '(´;ω;`) 头好晕...你点太快了',
        '我也有脾气的！'
    ];
    const messagesLate = [
        '再点一下试试',
        '嗯...没有了，真的没有了',
        '已经没有更多彩蛋了啊喂...？',
        '好吧，你赢了',
        '...（沉默）',
        '我已经...什么都不想说了 (´;ω;`)',
    ];

    const idleMessages = [
        '......zzZ', '好无聊啊......', '有人在吗？',
        '（打了个哈欠）', '溜了溜了', '（发呆中）',
        '要不要聊聊天', '（看风景）', '芜湖~♪',
        '（开始数天花板上的格子）',
        '有没有人呀...',
        '趁没人注意偷偷蹦一下',
        '（暗中观察）',
        '嘿嘿嘿...没人在看吧？',
        '（开始原地转圈圈）',
        '无聊到想翻个跟头',
        '（试图逃跑）',
        '（假装自己是一朵蘑菇）',
    ];
    const idleFaces = [
        '(－ω－) zzZ', '(´-ω-`)', '(。_。)', '(￣ω￣)',
        '(・_・)', '(　´_ゝ`)', '(´・ω・`)', '( ˘ω˘ )'
    ];

    let el = null;
    let faceEl = null;
    let bubbleEl = null;

    let clickCount = 0;
    let lastFace = '';
    let lastMessage = '';
    let bubbleTimer = null;
    let idleResetTimer = null;
    let idleActionTimer = null;
    let idleWiggleTimer = null;
    let popTimeout = null;
    let initFrame = null;
    let isIdle = false;
    let wasIdle = false;
    let generation = 0;
    let active = false;

    function onNaughtyDone() {
        if (isIdle) startIdleWiggle();
    }

    const naughtyActions = [
        function () {
            const g = generation;
            el.style.transition = 'left 0.6s ease';
            // 必须用可插值的具体数值（calc(100vw - 100px)），不能用 left:auto/right:30px：
            // 因为 transition 设在 left 上，而 left:auto 无法被插值，会导致瞬间跳变（无动画）+ 闪回
            el.style.left = 'calc(100vw - 100px)';
            faceEl.textContent = '(＞ω＜)';
            showBubble('嘿嘿，我跑到这边来了~', 3000);
            setTimeout(function () {
                if (generation !== g) return;
                el.style.left = '';
                setTimeout(function () {
                    if (generation !== g) return;
                    el.style.transition = '';
                    faceEl.textContent = pickUnique(idleFaces, faceEl.textContent);
                    onNaughtyDone();
                }, 700);
            }, 3000);
        },
        function () {
            const g = generation;
            el.style.transition = 'bottom 0.5s ease';
            el.style.bottom = '-80px';
            showBubble('我溜了......', 1500);
            setTimeout(function () {
                if (generation !== g) return;
                hideBubble();
                setTimeout(function () {
                    if (generation !== g) return;
                    el.style.bottom = '';
                    faceEl.textContent = '(ﾟ∀ﾟ)';
                    showBubble('我回来了！想我了吗', 2500);
                    setTimeout(function () {
                        if (generation !== g) return;
                        el.style.transition = '';
                        faceEl.textContent = pickUnique(idleFaces, faceEl.textContent);
                        onNaughtyDone();
                    }, 2800);
                }, 2000);
            }, 2000);
        },
        function () {
            const g = generation;
            faceEl.style.transform = 'scaleX(-1)';
            faceEl.textContent = '(・ω・)';
            showBubble('我反过来了......好玩', 3000);
            setTimeout(function () {
                if (generation !== g) return;
                faceEl.style.transform = '';
                onNaughtyDone();
            }, 3000);
        },
        function () {
            const g = generation;
            el.style.transition = 'left 0.8s ease';
            el.style.left = '50%';
            el.style.transform = 'translateX(-50%)';
            faceEl.textContent = '(ノ´▽`)ノ♪';
            showBubble('我来视察一下中间地带', 3000);
            setTimeout(function () {
                if (generation !== g) return;
                el.style.left = '';
                el.style.transform = '';
                setTimeout(function () {
                    if (generation !== g) return;
                    el.style.transition = '';
                    faceEl.textContent = pickUnique(idleFaces, faceEl.textContent);
                    onNaughtyDone();
                }, 900);
            }, 3500);
        },
        function () {
            const g = generation;
            const spinFaces = ['(・ω・)', '(・∀・)', '(ﾟ∀ﾟ)', '(≧▽≦)', '(Ｔ▽Ｔ)'];
            let i = 0;
            faceEl.textContent = spinFaces[0];
            showBubble('转转转......', 2000);
            const spinTimer = setInterval(function () {
                if (generation !== g) { clearInterval(spinTimer); return; }
                i++;
                if (i >= spinFaces.length) {
                    clearInterval(spinTimer);
                    faceEl.textContent = pickUnique(idleFaces, faceEl.textContent);
                    onNaughtyDone();
                    return;
                }
                faceEl.textContent = spinFaces[i];
            }, 300);
        }
    ];

    const wakeFace = '(ﾟ∀ﾟ)';
    const wakeMessages = [
        '来啦来啦！', '啊！你回来了！', '嗯？什么事？',
        '我醒了！', '嗷！别吓我...', '你终于来了！'
    ];

    function pickUnique(arr, last) {
        if (arr.length <= 1) return arr[0];
        let choice;
        let attempts = 0;
        do {
            choice = arr[Math.floor(Math.random() * arr.length)];
            attempts++;
        } while (choice === last && attempts < 10);
        return choice;
    }

    function getStagePool(arrEarly, arrMid, arrLate, stage) {
        if (stage >= 2) return arrLate;
        if (stage >= 1) return arrMid;
        return arrEarly;
    }

    function showBubble(text, duration) {
        clearTimeout(bubbleTimer);
        bubbleEl.textContent = text;
        bubbleEl.classList.add('show');
        bubbleTimer = setTimeout(hideBubble, duration || 2500);
    }

    function hideBubble() {
        clearTimeout(bubbleTimer);
        bubbleEl.classList.remove('show');
    }

    function pop() {
        clearTimeout(popTimeout);
        faceEl.style.transform = 'scale(1.2)';
        popTimeout = setTimeout(function () {
            faceEl.style.transform = '';
        }, 150);
    }

    function startIdleWiggle() {
        stopIdleWiggle();
        const transforms = ['rotate(-4deg)', 'rotate(4deg)', 'translateY(3px)', 'translateX(-3px)', 'translateX(3px)'];
        function step() {
            if (!isIdle) return;
            faceEl.style.transform = transforms[Math.floor(Math.random() * transforms.length)];
            idleWiggleTimer = setTimeout(function () {
                if (!isIdle) return;
                faceEl.style.transform = '';
                idleWiggleTimer = setTimeout(step, 800 + Math.random() * 1200);
            }, 600 + Math.random() * 800);
        }
        idleWiggleTimer = setTimeout(step, 500);
    }

    function stopIdleWiggle() {
        clearTimeout(idleWiggleTimer);
        faceEl.style.transform = '';
    }

    function resetPosition() {
        el.style.transition = '';
        el.style.left = '';
        el.style.bottom = '';
        el.style.transform = '';
        faceEl.style.transform = '';
    }

    function clearAllTimers() {
        generation++;
        clearTimeout(idleResetTimer);
        clearTimeout(idleActionTimer);
        clearTimeout(bubbleTimer);
        clearTimeout(popTimeout);
        stopIdleWiggle();
        resetPosition();
    }

    function resetToDefault() {
        isIdle = false;
        wasIdle = false;
        clickCount = 0;
        generation++;
        stopIdleWiggle();
        resetPosition();
        faceEl.textContent = defaultFace;
        hideBubble();
        scheduleIdleAction(10000);
    }

    function scheduleIdleReset() {
        clearTimeout(idleResetTimer);
        idleResetTimer = setTimeout(resetToDefault, 4000);
    }

    function scheduleIdleAction(delay) {
        clearTimeout(idleActionTimer);
        idleActionTimer = setTimeout(doIdleAction, delay || 10000);
    }

    function doIdleAction() {
        if (isIdle) {
            const r = Math.random();
            if (r < 0.35) {
                lastFace = pickUnique(idleFaces, lastFace);
                faceEl.textContent = lastFace;
                lastMessage = pickUnique(idleMessages, lastMessage);
                showBubble(lastMessage, 3000);
            } else if (r < 0.5) {
                stopIdleWiggle();
                naughtyActions[Math.floor(Math.random() * naughtyActions.length)]();
            } else {
                lastFace = pickUnique(idleFaces, lastFace);
                faceEl.textContent = lastFace;
            }
            scheduleIdleAction(8000 + Math.random() * 10000);
            return;
        }

        isIdle = true;
        wasIdle = true;
        stopIdleWiggle();

        lastFace = pickUnique(idleFaces, lastFace);
        faceEl.textContent = lastFace;
        lastMessage = pickUnique(idleMessages, lastMessage);
        showBubble(lastMessage, 3500);
        startIdleWiggle();

        scheduleIdleAction(6000 + Math.random() * 8000);
    }

    function onClick() {
        clearAllTimers();

        if (wasIdle) {
            isIdle = false;
            wasIdle = false;
            clickCount++;
            faceEl.textContent = wakeFace;
            const wakeMsg = pickUnique(wakeMessages, lastMessage);
            pop();
            showBubble(wakeMsg);
            lastMessage = wakeMsg;
            lastFace = wakeFace;
            scheduleIdleReset();
            return;
        }

        isIdle = false;
        clickCount++;

        const stage = clickCount < 10 ? 0 : (clickCount < 24 ? 1 : 2);
        const facePool = getStagePool(facesEarly, facesMid, facesLate, stage);
        const msgPool = getStagePool(messagesEarly, messagesMid, messagesLate, stage);

        lastFace = pickUnique(facePool, lastFace);
        faceEl.textContent = lastFace;

        lastMessage = pickUnique(msgPool, lastMessage);

        pop();
        showBubble(lastMessage);
        scheduleIdleReset();
    }

    function onKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            el.click();
        }
    }

    // ===== 对外接口 =====

    // 初始化（幂等）：创建 DOM、绑定事件、启动动画
    function init() {
        if (active) return;
        active = true;

        el = document.createElement('div');
        el.className = 'corner-kaomoji';
        el.setAttribute('aria-label', '点我玩');
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.innerHTML = '<span class="face">' + defaultFace + '</span><span class="bubble"></span>';
        document.body.appendChild(el);

        faceEl = el.querySelector('.face');
        bubbleEl = el.querySelector('.bubble');

        el.addEventListener('click', onClick);
        el.addEventListener('keydown', onKeydown);

        clickCount = 0;
        isIdle = false;
        wasIdle = false;
        generation = 0;
        faceEl.textContent = defaultFace;

        // 双 rAF 确保初始态（opacity:0 + translateX(-20px)）被浏览器渲染后再添加 .animate-in，
        // 否则浏览器会把两态合并成同一帧，过渡不触发，元素直接出现
        // 错峰延迟交给 CSS transition-delay（见 components.css .corner-kaomoji）
        initFrame = requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (!active) return;
                el.classList.add('animate-in');
                scheduleIdleAction(10000);
            });
        });
    }

    // 销毁：移除 DOM、清理所有定时器
    function destroy() {
        active = false;
        clearAllTimers();
        cancelAnimationFrame(initFrame);
        if (el) {
            el.removeEventListener('click', onClick);
            el.removeEventListener('keydown', onKeydown);
            if (el.parentNode) el.parentNode.removeChild(el);
            el = null;
            faceEl = null;
            bubbleEl = null;
        }
    }

    function isActive() {
        return active;
    }

    return { init: init, destroy: destroy, isActive: isActive };
})();

window.KaomojiWidget = KaomojiWidget;
