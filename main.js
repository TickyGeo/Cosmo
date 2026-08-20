
// ===== ПОЛУЧАЕМ КАНВАС =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===== ЭЛЕМЕНТЫ UI =====
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const highScoreDisplay = document.getElementById('highScore');
const gameOverDiv = document.getElementById('gameOver');
const finalScoreSpan = document.getElementById('finalScore');
const finalHighScoreSpan = document.getElementById('finalHighScore');
const restartBtn = document.getElementById('restartBtn');

// ===== ИГРОВЫЕ ПЕРЕМЕННЫЕ =====
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

let player = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 80,
    radius: 18,
    speed: 5
};

let stars = [];
let enemies = [];
let powerups = [];
let particles = [];
let bullets = [];

let score = 0;
let lives = 3;
let highScore = parseInt(localStorage.getItem('arcadeHighScore')) || 0;
let gameRunning = true;
let frameCount = 0;
let mouseX = GAME_WIDTH / 2;
let mouseY = GAME_HEIGHT - 80;

// ===== КЛАССЫ ДЛЯ ОБЪЕКТОВ =====
class Star {
    constructor() {
        this.x = Math.random() * GAME_WIDTH;
        this.y = 0;
        this.radius = 8 + Math.random() * 10;
        this.speed = 1 + Math.random() * 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.points = this.radius > 13 ? 3 : 1;
        this.color = this.points === 3 ? '#ffd700' : '#ff6b6b';
        this.glow = 0;
    }

    update() {
        this.y += this.speed;
        this.rotation += 0.02;
        this.glow = Math.sin(frameCount * 0.1) * 0.5 + 0.5;

        // Если вышла за экран - удаляем
        return this.y < GAME_HEIGHT + 20;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Свечение
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
        gradient.addColorStop(0, this.color + '80');
        gradient.addColorStop(1, this.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Звезда
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20 + this.glow * 20;
        ctx.fillStyle = this.color;
        ctx.beginPath();

        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const r = i === 0 ? this.radius : this.radius * 0.4;
            if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}

class Enemy {
    constructor() {
        this.x = Math.random() * (GAME_WIDTH - 60) + 30;
        this.y = -30;
        this.radius = 15 + Math.random() * 10;
        this.speed = 1.5 + Math.random() * 2;
        this.type = Math.random() > 0.7 ? 'big' : 'normal';
        this.hp = this.type === 'big' ? 3 : 1;
        this.maxHp = this.hp;
        this.angle = 0;
        this.color = this.type === 'big' ? '#ff4757' : '#ff6b81';
    }

    update() {
        this.y += this.speed;
        this.x += Math.sin(this.angle) * 0.5;
        this.angle += 0.02;
        return this.y < GAME_HEIGHT + 50;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Враг с щупальцами
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        gradient.addColorStop(0, '#ff6b81');
        gradient.addColorStop(1, '#c0392b');

        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 30;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Глаза
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-6, -4, 5, 0, Math.PI * 2);
        ctx.arc(6, -4, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(-6, -2, 2.5, 0, Math.PI * 2);
        ctx.arc(6, -2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // HP бар для больших врагов
        if (this.type === 'big') {
            ctx.shadowBlur = 0;
            const barWidth = this.radius * 2;
            const hpPercent = this.hp / this.maxHp;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-barWidth / 2, -this.radius - 12, barWidth, 4);
            ctx.fillStyle = hpPercent > 0.5 ? '#2ed573' : '#ff4757';
            ctx.fillRect(-barWidth / 2, -this.radius - 12, barWidth * hpPercent, 4);
        }

        ctx.restore();
    }

    takeDamage() {
        this.hp--;
        return this.hp <= 0;
    }
}

class Powerup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.type = Math.random() > 0.5 ? 'shield' : 'speed';
        this.speed = 1.5;
        this.angle = 0;
    }

    update() {
        this.y += this.speed;
        this.angle += 0.05;
        return this.y < GAME_HEIGHT + 20;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const color = this.type === 'shield' ? '#2ed573' : '#3498db';
        const symbol = this.type === 'shield' ? '🛡️' : '⚡';

        ctx.shadowColor = color;
        ctx.shadowBlur = 30;
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, 0, 0);
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1;
        this.decay = 0.01 + Math.random() * 0.02;
        this.radius = 2 + Math.random() * 4;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * 6;
        this.vy = Math.sin(angle) * 6;
        this.radius = 4;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        return this.x > -10 && this.x < GAME_WIDTH + 10 &&
            this.y > -10 && this.y < GAME_HEIGHT + 10;
    }

    draw(ctx) {
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ===== СОЗДАНИЕ ОБЪЕКТОВ =====
function spawnStar() {
    if (Math.random() < 0.03) {
        stars.push(new Star());
    }
}

function spawnEnemy() {
    if (frameCount > 60 && Math.random() < 0.015 + score / 10000) {
        enemies.push(new Enemy());
    }
}

function spawnPowerup(x, y) {
    if (Math.random() < 0.15) {
        powerups.push(new Powerup(x, y));
    }
}

function createExplosion(x, y, color, count = 30) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// ===== ОБРАБОТКА ВВОДА =====
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;

    // Ограничиваем
    mouseX = Math.max(player.radius, Math.min(GAME_WIDTH - player.radius, mouseX));
    mouseY = Math.max(player.radius, Math.min(GAME_HEIGHT - player.radius, mouseY));
});

canvas.addEventListener('click', () => {
    if (!gameRunning) return;
    // Стрельба
    const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    bullets.push(new Bullet(player.x, player.y, angle));
});

// ===== ОБНОВЛЕНИЕ ИГРЫ =====
function update() {
    if (!gameRunning) return;

    frameCount++;

    // Движение игрока (плавное следование за мышью)
    player.x += (mouseX - player.x) * 0.15;
    player.y += (mouseY - player.y) * 0.15;

    // Спавн объектов
    spawnStar();
    spawnEnemy();

    // Обновляем звёзды
    stars = stars.filter(star => star.update());

    // Обновляем врагов
    enemies = enemies.filter(enemy => enemy.update());

    // Обновляем пули
    bullets = bullets.filter(bullet => bullet.update());

    // Обновляем бонусы
    powerups = powerups.filter(powerup => powerup.update());

    // Обновляем частицы
    particles = particles.filter(p => p.update());

    // ===== КОЛЛИЗИИ =====

    // Пули vs Враги
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            const dx = bullets[i].x - enemies[j].x;
            const dy = bullets[i].y - enemies[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < bullets[i].radius + enemies[j].radius) {
                // Попадание
                createExplosion(bullets[i].x, bullets[i].y, '#ffd700', 15);
                bullets.splice(i, 1);

                if (enemies[j].takeDamage()) {
                    // Враг уничтожен
                    const points = enemies[j].type === 'big' ? 5 : 2;
                    score += points;
                    createExplosion(enemies[j].x, enemies[j].y, '#ff4757', 40);
                    spawnPowerup(enemies[j].x, enemies[j].y);
                    enemies.splice(j, 1);
                    updateUI();
                }
                break;
            }
        }
    }

    // Игрок vs Звёзды
    for (let i = stars.length - 1; i >= 0; i--) {
        const dx = player.x - stars[i].x;
        const dy = player.y - stars[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < player.radius + stars[i].radius) {
            score += stars[i].points;
            createExplosion(stars[i].x, stars[i].y, '#ffd700', 20);
            stars.splice(i, 1);
            updateUI();
        }
    }

    // Игрок vs Враги
    for (let i = enemies.length - 1; i >= 0; i--) {
        const dx = player.x - enemies[i].x;
        const dy = player.y - enemies[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < player.radius + enemies[i].radius) {
            // Урон игроку
            createExplosion(player.x, player.y, '#ff4757', 50);
            lives--;
            updateUI();

            if (lives <= 0) {
                gameOver();
                return;
            }

            // Уничтожаем врага
            enemies.splice(i, 1);

            // Краткая неуязвимость (телепорт в центр)
            player.x = GAME_WIDTH / 2;
            player.y = GAME_HEIGHT - 80;
            mouseX = player.x;
            mouseY = player.y;
        }
    }

    // Игрок vs Бонусы
    for (let i = powerups.length - 1; i >= 0; i--) {
        const dx = player.x - powerups[i].x;
        const dy = player.y - powerups[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < player.radius + powerups[i].radius) {
            if (powerups[i].type === 'shield') {
                score += 10;
                createExplosion(powerups[i].x, powerups[i].y, '#2ed573', 30);
            } else {
                score += 5;
                createExplosion(powerups[i].x, powerups[i].y, '#3498db', 30);
            }
            powerups.splice(i, 1);
            updateUI();
        }
    }
}

// ===== ОТРИСОВКА =====
function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Звёздный фон
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 50; i++) {
        const x = (i * 137.5) % GAME_WIDTH;
        const y = (i * 97.3 + frameCount * 0.2) % GAME_HEIGHT;
        const size = (i % 3) + 1;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Отрисовка объектов
    powerups.forEach(p => p.draw(ctx));
    stars.forEach(s => s.draw(ctx));
    enemies.forEach(e => e.draw(ctx));
    bullets.forEach(b => b.draw(ctx));
    particles.forEach(p => p.draw(ctx));

    // Отрисовка игрока
    ctx.save();
    ctx.translate(player.x, player.y);

    // Свечение
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, player.radius * 2);
    gradient.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Корабль
    ctx.shadowColor = '#64c8ff';
    ctx.shadowBlur = 30;

    // Тело
    const grd = ctx.createLinearGradient(0, -player.radius, 0, player.radius);
    grd.addColorStop(0, '#64c8ff');
    grd.addColorStop(1, '#2980b9');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, -player.radius);
    ctx.lineTo(-player.radius * 0.8, player.radius * 0.6);
    ctx.lineTo(-player.radius * 0.3, player.radius * 0.3);
    ctx.lineTo(0, player.radius * 0.8);
    ctx.lineTo(player.radius * 0.3, player.radius * 0.3);
    ctx.lineTo(player.radius * 0.8, player.radius * 0.6);
    ctx.closePath();
    ctx.fill();

    // Кабина
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(0, -player.radius * 0.3, player.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ===== ОБНОВЛЕНИЕ UI =====
function updateUI() {
    scoreDisplay.textContent = `⭐ ${score}`;
    livesDisplay.textContent = '❤️ '.repeat(Math.max(0, lives)).trim() || '💀';
    highScoreDisplay.textContent = `🏆 Рекорд: ${highScore}`;

    // Обновляем рекорд
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('arcadeHighScore', highScore.toString());
        highScoreDisplay.textContent = `🏆 Рекорд: ${highScore}`;
    }
}

// ===== ИГРОВОЙ ЦИКЛ =====
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ===== КОНЕЦ ИГРЫ =====
function gameOver() {
    gameRunning = false;
    finalScoreSpan.textContent = score;
    finalHighScoreSpan.textContent = highScore;
    gameOverDiv.style.display = 'block';

    // Финальный взрыв
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            createExplosion(
                Math.random() * GAME_WIDTH,
                Math.random() * GAME_HEIGHT,
                '#ff4757',
                30
            );
        }, i * 100);
    }
}

// ===== ПЕРЕЗАПУСК =====
function restartGame() {
    // Сброс всех переменных
    player.x = GAME_WIDTH / 2;
    player.y = GAME_HEIGHT - 80;
    stars = [];
    enemies = [];
    powerups = [];
    particles = [];
    bullets = [];
    score = 0;
    lives = 3;
    gameRunning = true;
    frameCount = 0;
    mouseX = GAME_WIDTH / 2;
    mouseY = GAME_HEIGHT - 80;

    gameOverDiv.style.display = 'none';
    updateUI();
}

// ===== СОБЫТИЯ КНОПОК =====
restartBtn.addEventListener('click', restartGame);

// ===== ЗАПУСК =====
updateUI();
gameLoop();

// Показываем управление
console.log('🎮 Игра запущена! Двигай мышью, кликай для стрельбы!');
