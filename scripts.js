        // ========================================
        // GAME CONFIGURATION & SETUP
        // ========================================
        
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size (responsive)
        const setCanvasSize = () => {
            const maxWidth = 750;
            const containerWidth = document.querySelector('.game-container').clientWidth - 80;
            canvas.width = Math.min(maxWidth, containerWidth);
            canvas.height = 600;
        };
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        // ========================================
        // GAME STATE VARIABLES
        // ========================================
        
        let score = 0;
        let lives = 3;
        let level = 1;
        let gameRunning = false;
        let gamePaused = false;
        let animationId = null;
        let particles = [];
        let scorePopups = [];

        // ========================================
        // PARTICLE SYSTEM
        // ========================================
        
        class Particle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 6;
                this.vy = (Math.random() - 0.5) * 6;
                this.life = 1;
                this.decay = 0.02;
                this.size = Math.random() * 4 + 2;
                this.color = color;
            }
            
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.2; // gravity
                this.life -= this.decay;
            }
            
            draw() {
                ctx.save();
                ctx.globalAlpha = this.life;
                ctx.fillStyle = this.color;
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class ScorePopup {
            constructor(x, y, points) {
                this.x = x;
                this.y = y;
                this.points = points;
                this.life = 1;
                this.vy = -2;
            }
            
            update() {
                this.y += this.vy;
                this.life -= 0.02;
            }
            
            draw() {
                ctx.save();
                ctx.globalAlpha = this.life;
                ctx.fillStyle = '#ffeb3b';
                ctx.font = 'bold 24px Orbitron';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffeb3b';
                ctx.fillText(`+${this.points}`, this.x, this.y);
                ctx.restore();
            }
        }

        function createParticles(x, y, color, count = 15) {
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(x, y, color));
            }
        }

        function updateParticles() {
            particles = particles.filter(p => p.life > 0);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            
            scorePopups = scorePopups.filter(s => s.life > 0);
            scorePopups.forEach(s => {
                s.update();
                s.draw();
            });
        }

        // ========================================
        // PADDLE CONFIGURATION
        // ========================================
        
        const paddle = {
            width: 120,
            height: 15,
            x: canvas.width / 2 - 60,
            y: canvas.height - 40,
            speed: 8,
            dx: 0,
            targetX: canvas.width / 2 - 60
        };

        // ========================================
        // BALL CONFIGURATION
        // ========================================
        
        const ball = {
            x: canvas.width / 2,
            y: canvas.height - 60,
            radius: 8,
            speed: 5,
            dx: 5,
            dy: -5,
            trail: []
        };

        // ========================================
        // BRICK CONFIGURATION
        // ========================================
        
        const brickConfig = {
            rowCount: 5,
            columnCount: 9,
            width: 70,
            height: 25,
            padding: 10,
            offsetTop: 80,
            offsetLeft: 35,
            colors: [
                { fill: '#ec4899', glow: '#ec4899' },
                { fill: '#f97316', glow: '#f97316' },
                { fill: '#eab308', glow: '#eab308' },
                { fill: '#22c55e', glow: '#22c55e' },
                { fill: '#3b82f6', glow: '#3b82f6' }
            ]
        };

        let bricks = [];

        // ========================================
        // INITIALIZE BRICKS
        // ========================================
        
        function createBricks() {
            bricks = [];
            for (let row = 0; row < brickConfig.rowCount; row++) {
                bricks[row] = [];
                for (let col = 0; col < brickConfig.columnCount; col++) {
                    const colorData = brickConfig.colors[row];
                    bricks[row][col] = {
                        x: col * (brickConfig.width + brickConfig.padding) + brickConfig.offsetLeft,
                        y: row * (brickConfig.height + brickConfig.padding) + brickConfig.offsetTop,
                        width: brickConfig.width,
                        height: brickConfig.height,
                        status: 1,
                        color: colorData.fill,
                        glowColor: colorData.glow,
                        points: (5 - row) * 10,
                        pulse: Math.random() * Math.PI * 2
                    };
                }
            }
        }

        // ========================================
        // DRAWING FUNCTIONS
        // ========================================
        
        // Draw the paddle with gradient and glow
        function drawPaddle() {
            const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(0.5, '#8b5cf6');
            gradient.addColorStop(1, '#667eea');
            
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#8b5cf6';
            
            // Draw rounded rectangle for paddle
            ctx.beginPath();
            ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 8);
            ctx.fill();
            
            // Add highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height / 3, [8, 8, 0, 0]);
            ctx.fill();
        }

        // Draw the ball with trail effect
        function drawBall() {
            // Draw trail
            ball.trail.forEach((pos, index) => {
                const alpha = (index / ball.trail.length) * 0.5;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#00f2fe';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f2fe';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, ball.radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
            
            // Draw main ball with gradient
            const gradient = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 0, ball.x, ball.y, ball.radius);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.4, '#00f2fe');
            gradient.addColorStop(1, '#0ea5e9');
            
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#00f2fe';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Draw all bricks with pulsing glow
        function drawBricks() {
            const time = Date.now() * 0.001;
            
            for (let row = 0; row < brickConfig.rowCount; row++) {
                for (let col = 0; col < brickConfig.columnCount; col++) {
                    const brick = bricks[row][col];
                    if (brick.status === 1) {
                        // Pulsing glow effect
                        const pulseIntensity = Math.sin(time * 2 + brick.pulse) * 0.3 + 0.7;
                        
                        ctx.shadowBlur = 15 * pulseIntensity;
                        ctx.shadowColor = brick.glowColor;
                        
                        // Main brick fill
                        ctx.fillStyle = brick.color;
                        ctx.beginPath();
                        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 6);
                        ctx.fill();
                        
                        ctx.shadowBlur = 0;
                        
                        // Highlight gradient
                        const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
                        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
                        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
                        
                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 6);
                        ctx.fill();
                        
                        // Border
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 6);
                        ctx.stroke();
                    }
                }
            }
        }

        // Draw game over screen
        function drawGameOver() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Glow effect
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 70px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ffffff';
            ctx.fillStyle = '#ffffff';
            ctx.font = '32px Rajdhani';
            ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 30);
            
            ctx.shadowBlur = 0;
            ctx.font = '22px Rajdhani';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 90);
        }

        // Draw victory screen
        function drawVictory() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Animated victory text
            const time = Date.now() * 0.003;
            const scale = 1 + Math.sin(time) * 0.05;
            
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2 - 50);
            ctx.scale(scale, scale);
            
            ctx.shadowBlur = 50;
            ctx.shadowColor = '#22c55e';
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 70px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('VICTORY!', 0, 0);
            ctx.restore();
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#fbbf24';
            ctx.fillStyle = '#fbbf24';
            ctx.font = '32px Rajdhani';
            ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 30);
            
            ctx.shadowBlur = 0;
            ctx.font = '22px Rajdhani';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Press R to Play Again', canvas.width / 2, canvas.height / 2 + 90);
        }

        // Draw pause screen
        function drawPaused() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#8b5cf6';
            ctx.fillStyle = '#8b5cf6';
            ctx.font = 'bold 60px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
            
            ctx.shadowBlur = 0;
            ctx.font = '22px Rajdhani';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Press SPACE to Resume', canvas.width / 2, canvas.height / 2 + 60);
        }

        // ========================================
        // GAME MECHANICS
        // ========================================
        
        // Move the paddle with smooth interpolation
        function movePaddle() {
            // Smooth movement
            const dx = paddle.targetX - paddle.x;
            paddle.x += dx * 0.15;
            
            // Clamp within bounds
            if (paddle.x < 0) paddle.x = 0;
            if (paddle.x + paddle.width > canvas.width) {
                paddle.x = canvas.width - paddle.width;
            }
        }

        // Move the ball
        function moveBall() {
            ball.x += ball.dx;
            ball.y += ball.dy;
            
            // Update trail
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > 8) {
                ball.trail.shift();
            }
            
            // Wall collision (left and right)
            if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
                ball.dx *= -1;
                createParticles(ball.x, ball.y, '#00f2fe', 8);
            }
            
            // Wall collision (top)
            if (ball.y - ball.radius < 0) {
                ball.dy *= -1;
                createParticles(ball.x, ball.y, '#00f2fe', 8);
            }
            
            // Paddle collision
            if (
                ball.y + ball.radius > paddle.y &&
                ball.y - ball.radius < paddle.y + paddle.height &&
                ball.x > paddle.x &&
                ball.x < paddle.x + paddle.width
            ) {
                // Calculate hit position for angle variation
                const hitPos = (ball.x - paddle.x) / paddle.width;
                const angle = (hitPos - 0.5) * Math.PI / 3;
                const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                
                ball.dx = speed * Math.sin(angle);
                ball.dy = -Math.abs(speed * Math.cos(angle));
                
                createParticles(ball.x, ball.y, '#8b5cf6', 12);
            }
            
            // Bottom wall - lose a life
            if (ball.y + ball.radius > canvas.height) {
                lives--;
                updateDisplay();
                
                if (lives === 0) {
                    gameRunning = false;
                    setTimeout(() => drawGameOver(), 100);
                } else {
                    resetBall();
                }
            }
        }

        // Detect brick collisions
        function detectBrickCollision() {
            for (let row = 0; row < brickConfig.rowCount; row++) {
                for (let col = 0; col < brickConfig.columnCount; col++) {
                    const brick = bricks[row][col];
                    
                    if (brick.status === 1) {
                        if (
                            ball.x > brick.x &&
                            ball.x < brick.x + brick.width &&
                            ball.y > brick.y &&
                            ball.y < brick.y + brick.height
                        ) {
                            ball.dy *= -1;
                            brick.status = 0;
                            score += brick.points;
                            updateDisplay();
                            
                            // Create particles and score popup
                            createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 20);
                            scorePopups.push(new ScorePopup(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.points));
                            
                            // Check for victory
                            if (checkVictory()) {
                                gameRunning = false;
                                setTimeout(() => drawVictory(), 100);
                            }
                        }
                    }
                }
            }
        }

        // Check if all bricks are destroyed
        function checkVictory() {
            for (let row = 0; row < brickConfig.rowCount; row++) {
                for (let col = 0; col < brickConfig.columnCount; col++) {
                    if (bricks[row][col].status === 1) {
                        return false;
                    }
                }
            }
            return true;
        }

        // Reset ball position
        function resetBall() {
            ball.x = canvas.width / 2;
            ball.y = canvas.height - 60;
            ball.dx = 5 * (Math.random() > 0.5 ? 1 : -1);
            ball.dy = -5;
            ball.trail = [];
        }

        // Update score and lives display with animation
        function updateDisplay() {
            document.getElementById('score').textContent = score;
            document.getElementById('lives').textContent = lives;
            document.getElementById('level').textContent = level;
        }

        // ========================================
        // GAME LOOP
        // ========================================
        
        function gameLoop() {
            if (!gameRunning) {
                return;
            }
            
            if (gamePaused) {
                drawPaused();
                animationId = requestAnimationFrame(gameLoop);
                return;
            }
            
            // Clear canvas with fade effect
            ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw game elements
            drawBricks();
            updateParticles();
            drawBall();
            drawPaddle();
            
            // Update game state
            movePaddle();
            moveBall();
            detectBrickCollision();
            
            // Continue game loop
            animationId = requestAnimationFrame(gameLoop);
        }

        // ========================================
        // GAME CONTROLS
        // ========================================
        
        // Mouse movement for paddle control
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            paddle.targetX = mouseX - paddle.width / 2;
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (gameRunning) {
                    gamePaused = !gamePaused;
                }
            }
            
            if (e.code === 'KeyR') {
                e.preventDefault();
                initGame();
            }
        });

        // Touch support for mobile
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const touchX = e.touches[0].clientX - rect.left;
            paddle.targetX = touchX - paddle.width / 2;
        }, { passive: false });

        // ========================================
        // GAME INITIALIZATION
        // ========================================
        
        function initGame() {
            score = 0;
            lives = 3;
            level = 1;
            gameRunning = true;
            gamePaused = false;
            particles = [];
            scorePopups = [];
            
            paddle.x = canvas.width / 2 - paddle.width / 2;
            paddle.targetX = paddle.x;
            
            resetBall();
            createBricks();
            updateDisplay();
            
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            
            gameLoop();
        }

        // ========================================
        // START THE GAME
        // ========================================
        
        initGame();