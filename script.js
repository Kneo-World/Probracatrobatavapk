const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.style.backgroundColor = "black";

const VIRTUAL_WIDTH = 1080;
const VIRTUAL_HEIGHT = 2132;

let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resize() {
    const windowRatio = window.innerWidth / window.innerHeight;
    const virtualRatio = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;

    if (windowRatio > virtualRatio) {
        scale = window.innerHeight / VIRTUAL_HEIGHT;
        offsetX = (window.innerWidth - VIRTUAL_WIDTH * scale) / 2;
        offsetY = 0;
    } else {
        scale = window.innerWidth / VIRTUAL_WIDTH;
        offsetX = 0;
        offsetY = (window.innerHeight - VIRTUAL_HEIGHT * scale) / 2;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

class EventBus {
    constructor() {
        this.listeners = {};
    }
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    emit(event) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb());
        }
    }
}

const bus = new EventBus();

const Variables = {
    "Очки": 0,
    "Очки 2": 0,
    "Ник": "Player",
    "золото": 0,
    "урофень": 1,
    load() {
        const saved = localStorage.getItem('ninja_turtles_data');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(this, data);
        }
    },
    save() {
        localStorage.setItem('ninja_turtles_data', JSON.stringify(this));
    }
};
Variables.load();

const ImageCache = {};
function getImage(name) {
    if (!ImageCache[name]) {
        const img = new Image();
        img.src = `images/${name}`;
        ImageCache[name] = img;
    }
    return ImageCache[name];
}

class Sprite {
    constructor(name, lookFiles) {
        this.name = name;
        this.looks = lookFiles.map(f => getImage(f));
        this.currentLookIndex = 0;
        this.x = 0;
        this.y = 0;
        this.size = 100;
        this.visible = true;
        this.opacity = 1;
        this.rotation = 0;
        this.texts = [];
        this.bubbleText = "";
        this.bubbleTimer = 0;
    }

    get width() { return this.looks[this.currentLookIndex].width * (this.size / 100); }
    get height() { return this.looks[this.currentLookIndex].height * (this.size / 100); }

    draw() {
        if (!this.visible) return;
        ctx.save();
        const screenX = offsetX + (this.x + VIRTUAL_WIDTH / 2) * scale;
        const screenY = offsetY + (VIRTUAL_HEIGHT / 2 - this.y) * scale;
        ctx.translate(screenX, screenY);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.globalAlpha = this.opacity;
        
        const img = this.looks[this.currentLookIndex];
        if (img.complete) {
            const dw = img.width * (this.size / 100) * scale;
            const dh = img.height * (this.size / 100) * scale;
            ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        }

        this.texts.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.font = `${t.size * scale}px Arial`;
            ctx.textAlign = "center";
            const val = Variables[t.variable] !== undefined ? Variables[t.variable] : "";
            ctx.fillText(val, 0, 0);
        });

        if (this.bubbleTimer > 0) {
            ctx.fillStyle = "white";
            ctx.font = `${40 * scale}px Arial`;
            ctx.fillText(this.bubbleText, 0, -100 * scale);
        }

        ctx.restore();
    }

    isTouched(tx, ty) {
        const screenX = offsetX + (this.x + VIRTUAL_WIDTH / 2) * scale;
        const screenY = offsetY + (VIRTUAL_HEIGHT / 2 - this.y) * scale;
        const dw = this.width * scale;
        const dh = this.height * scale;
        return tx >= screenX - dw / 2 && tx <= screenX + dw / 2 &&
               ty >= screenY - dh / 2 && ty <= screenY + dh / 2;
    }

    glide(tx, ty, duration) {
        const startX = this.x;
        const startY = this.y;
        const startTime = Date.now();
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            this.x = startX + (tx - startX) * progress;
            this.y = startY + (ty - startY) * progress;
            if (progress < 1) requestAnimationFrame(animate);
        };
        animate();
    }
}

let currentScene = "Сцена 2";
const scenes = {};

function changeScene(name) {
    currentScene = name;
    if (scenes[name] && scenes[name].init) scenes[name].init();
}

// SCENE 2 (Main Menu)
scenes["Сцена 2"] = {
    sprites: [],
    init() {
        const bg = new Sprite("Фон", ["Фон.png"]);
        const playBtn = new Sprite("играть", ["Мой актер или объект.png"]);
        playBtn.x = 16; playBtn.y = 6;
        playBtn.onTouch = () => changeScene("Сцена 1");
        this.sprites = [bg, playBtn];
    }
};

// SCENE 1 (Main Game)
scenes["Сцена 1"] = {
    sprites: [],
    init() {
        const bg = new Sprite("Фон", ["Фон.png"]);
        bg.x = 1596; bg.y = -90; bg.size = 400;
        const loopBg = () => {
            bg.glide(-1600, 183, 25);
            setTimeout(() => bg.glide(1596, -90, 25), 25100);
            setTimeout(loopBg, 50200);
        };
        loopBg();

        const mainCat = new Sprite("1 (1)", Array.from({length: 47}, (_, i) => i === 0 ? "Мой актер или объект_#6.png" : `1_#${43+i}.png`));
        mainCat.x = -270; mainCat.y = 201; mainCat.size = 50;
        mainCat.texts.push({variable: "Очки", size: 200, color: "#84E0FF"});
        mainCat.onTouch = () => {
            Variables["Очки"] += 1;
            Variables.save();
        };

        const ticketsObj = new Sprite("1", ["Мой актер или объект.png"]);
        ticketsObj.x = 260; ticketsObj.y = 188; ticketsObj.size = 50;
        ticketsObj.texts.push({variable: "Очки 2", size: 200, color: "#FF9296"});
        setInterval(() => { if(currentScene === "Сцена 1") Variables["Очки 2"] += 5; }, 10000);

        const goldObj = new Sprite("1 (2)", ["Мой актер или объект_#1.png"]);
        goldObj.x = 3; goldObj.y = -470; goldObj.size = 50;
        goldObj.texts.push({variable: "золото", size: 200, color: "#FFEF79"});
        setInterval(() => { if(currentScene === "Сцена 1") Variables["золото"] += 1; }, 1000);

        const shopBtn = new Sprite("Магазин", ["Мой актер или объект_#0.png"]);
        shopBtn.x = 336; shopBtn.y = 981; shopBtn.size = 105;
        shopBtn.onTouch = () => changeScene("Магазин");

        const boxesBtn = new Sprite("Боксы", ["Мой актер или объект_#3.png"]);
        boxesBtn.x = -65; boxesBtn.y = 845; boxesBtn.size = 105;
        boxesBtn.onTouch = () => changeScene("боксы");

        const profileBtn = new Sprite("Профиль", ["Мой актер или объект_#2.png"]);
        profileBtn.x = -65; profileBtn.y = 981; profileBtn.size = 105;
        profileBtn.onTouch = () => changeScene("ппофиль");

        const exitBtn = new Sprite("Назад", ["Мой актер или объект_#5.png"]);
        exitBtn.x = -400; exitBtn.y = 914; exitBtn.size = 103;
        exitBtn.onTouch = () => window.close();

        // Pon helpers
        const pon1 = new Sprite("Пон (2)", ["Мой актер или объект_#10.png"]);
        pon1.x = -270; pon1.y = -27;
        pon1.onTouch = () => { pon1.bubbleText = "Это очки..."; pon1.bubbleTimer = 600; };

        this.sprites = [bg, mainCat, ticketsObj, goldObj, shopBtn, boxesBtn, profileBtn, exitBtn, pon1];
    },
    update() {
        const cat = this.sprites[1];
        if (Variables["Очки"] >= 7250) cat.currentLookIndex = 46;
        else if (Variables["Очки"] >= 7100) cat.currentLookIndex = 45;
        else if (Variables["Очки"] >= 7000) cat.currentLookIndex = 44;
        else if (Variables["Очки"] >= 6900) cat.currentLookIndex = 43;
        // Simplified mapping for brevity in logic
        else cat.currentLookIndex = Math.min(Math.floor(Variables["Очки"] / 150), 42);
    }
};

// SHOP SCENE
scenes["Магазин"] = {
    sprites: [],
    init() {
        const bg = new Sprite("Фон", ["Фон_#4.png"]);
        bg.size = 400; bg.x = 1596; bg.y = -90;
        
        const back = new Sprite("Назад", ["Мой актер или объект_#0.png"]);
        back.x = -360; back.y = 973; back.onTouch = () => changeScene("Сцена 1");

        const item1 = new Sprite("Акция", ["Мой актер или объект_#1.png"]);
        item1.x = 1; item1.y = 629; item1.size = 70;
        item1.onTouch = () => {
            if (Variables["Очки 2"] >= 700) {
                Variables["Очки"] += 999;
                Variables["Очки 2"] -= 700;
                Variables.save();
            }
        };

        const item2 = new Sprite("Акция (3)", ["Мой актер или объект_#4.png"]);
        item2.x = 3; item2.y = 171; item2.size = 70;
        item2.onTouch = () => {
            if (Variables["Очки 2"] >= 300) {
                Variables["Очки"] += 200;
                Variables["Очки 2"] -= 300;
                Variables.save();
            }
        };

        this.sprites = [bg, back, item1, item2];
    }
};

// BOXES SCENE
scenes["боксы"] = {
    sprites: [],
    init() {
        const bg = new Sprite("Фон", ["Фон_#4.png"]); bg.size = 400;
        const back = new Sprite("Назад", ["Мой актер или объект_#1.png"]);
        back.x = -360; back.y = 973; back.onTouch = () => changeScene("Сцена 1");

        const box1 = new Sprite("Мега", ["Мой актер или объект_#0.png"]);
        box1.x = 192; box1.y = 557; box1.size = 80;
        box1.onTouch = () => {
            if (Variables["золото"] >= 100) {
                Variables["золото"] -= 100;
                changeScene("Мегабоксик");
            }
        };

        this.sprites = [bg, back, box1];
    }
};

// PROFILE SCENE
scenes["ппофиль"] = {
    sprites: [],
    init() {
        const bg = new Sprite("Фон", ["Фон_#4.png"]); bg.size = 400;
        const passport = new Sprite("Паспорт", ["Мой актер или объект.png"]);
        passport.x = -3; passport.y = 505;
        passport.texts.push({variable: "Ник", size: 120, color: "white"});
        
        const back = new Sprite("Назад", ["Мой актер или объект_#1.png"]);
        back.x = -360; back.y = 973; back.onTouch = () => changeScene("Сцена 1");

        const nickBtn = new Sprite("Ник", ["Мой актер или объект_#8.png"]);
        nickBtn.x = 194; nickBtn.y = 745; nickBtn.size = 103;
        nickBtn.onTouch = () => {
            const n = prompt("Как тебя зовут?");
            if (n) {
                Variables["Ник"] = n;
                Variables.save();
            }
        };

        this.sprites = [bg, passport, back, nickBtn];
    }
};

// BOX OPENING SCENES
scenes["Мегабоксик"] = {
    sprites: [],
    init() {
        const bg = new Sprite("Фон", ["Фон.png"]);
        const box = new Sprite("Бокс", ["Мой актер или объект.png"]);
        box.x = 4; box.y = 1380;
        box.glide(4, -217, 1);
        box.onTouch = () => bus.emit("бокс");
        
        const win = new Sprite("V", ["Мой актер или объект_#0.png"]);
        win.visible = false;
        bus.on("бокс", () => {
            win.visible = true;
            Variables["Очки 2"] += 25;
            Variables.save();
        });
        win.onTouch = () => changeScene("Сцена 1");
        this.sprites = [bg, box, win];
    }
};

// GLOBAL LOOP
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scene = scenes[currentScene];
    if (scene) {
        if (scene.update) scene.update();
        scene.sprites.forEach(s => {
            if (s.bubbleTimer > 0) s.bubbleTimer--;
            s.draw();
        });
    }
    requestAnimationFrame(update);
}

// INPUT
function handleInput(ex, ey) {
    const scene = scenes[currentScene];
    if (scene) {
        for (let i = scene.sprites.length - 1; i >= 0; i--) {
            const s = scene.sprites[i];
            if (s.isTouched(ex, ey)) {
                if (s.onTouch) s.onTouch();
                break;
            }
        }
    }
}

canvas.addEventListener('mousedown', e => handleInput(e.clientX, e.clientY));
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    handleInput(e.touches[0].clientX, e.touches[0].clientY);
});

// START
changeScene("Сцена 2");
update();
