<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
    let scene, camera, renderer, player, painting;
    let keys = {}, mouseX = 0, mouseY = 0;
    let velocity = new THREE.Vector3();
    let canJump = false;
    let inLevel = false;
    let enemies = [], stars = 0;
    let gameStarted = false;
    let collisionObjects = [];
    
    // Configuration
    const GRAVITY = 0.015;
    const JUMP_FORCE = 0.3;
    const SPEED = 0.12;

    document.getElementById('startBtn').addEventListener('click', startGame);
    
    function startGame() {
        if (gameStarted) return;
        gameStarted = true;
        
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('gameCanvas').classList.remove('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('instructions').classList.remove('hidden');
        
        init();
        animate();
    }
    
    function init() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.Fog(0x87CEEB, 20, 150);
        
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        const canvas = document.getElementById('gameCanvas');
        renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
        sunLight.position.set(50, 100, 50);
        sunLight.castShadow = true;
        // Amélioration de la portée des ombres
        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        scene.add(sunLight);
        
        createPlayer();
        createCastle();
        
        // Contrôles
        document.addEventListener('keydown', (e) => keys[e.code] = true);
        document.addEventListener('keyup', (e) => keys[e.code] = false);
        
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === canvas) {
                // Correction Caméra : On ajuste les signes pour que le mouvement soit naturel
                mouseX -= e.movementX * 0.003;
                mouseY -= e.movementY * 0.003; // Inversé ici pour corriger ton bug
                mouseY = Math.max(-Math.PI/2.5, Math.min(Math.PI/4, mouseY));
            }
        });
        
        canvas.addEventListener('click', () => canvas.requestPointerLock());
        window.addEventListener('resize', onWindowResize);
    }

    function createPlayer() {
        player = new THREE.Group();
        
        // Corps détaillé (on garde ton design cubique mais avec des proportions ajustées)
        const matRed = new THREE.MeshLambertMaterial({color: 0xE52521});
        const matBlue = new THREE.MeshLambertMaterial({color: 0x0430D9});
        const matSkin = new THREE.MeshLambertMaterial({color: 0xFFDBAC});
        
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), matRed);
        body.position.y = 1.2;
        body.castShadow = true;
        
        const pants = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.55), matBlue);
        pants.position.y = 0.8;
        pants.castShadow = true;

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matSkin);
        head.position.y = 1.8;
        
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), matRed);
        cap.position.y = 2.05;

        player.add(body, pants, head, cap);
        player.position.set(0, 5, 15);
        scene.add(player);
    }

    function createCastle() {
        collisionObjects = [];
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(60, 1, 60),
            new THREE.MeshLambertMaterial({color: 0x3d8c40})
        );
        floor.receiveShadow = true;
        floor.position.y = -0.5;
        scene.add(floor);
        collisionObjects.push(floor);

        // Murs plus stylisés
        const wallMat = new THREE.MeshLambertMaterial({color: 0xcccccc});
        const wall = new THREE.Mesh(new THREE.BoxGeometry(40, 15, 1), wallMat);
        wall.position.set(0, 7.5, -20);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        collisionObjects.push(wall);

        // Tableau magique
        const pGeo = new THREE.BoxGeometry(6, 8, 0.2);
        const pMat = new THREE.MeshPhongMaterial({color: 0x0000ff, emissive: 0x000033});
        painting = new THREE.Mesh(pGeo, pMat);
        painting.position.set(0, 6, -19.4);
        scene.add(painting);
    }

    function updatePhysics() {
        // Déplacement basé sur la rotation de la souris (Y-axis)
        const moveDir = new THREE.Vector3();
        if(keys['KeyW']) moveDir.z -= 1;
        if(keys['KeyS']) moveDir.z += 1;
        if(keys['KeyA']) moveDir.x -= 1;
        if(keys['KeyD']) moveDir.x += 1;

        moveDir.normalize();
        moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
        
        velocity.x = moveDir.x * SPEED;
        velocity.z = moveDir.z * SPEED;

        // Gravité
        velocity.y -= GRAVITY;

        // Application mouvement
        player.position.x += velocity.x;
        player.position.z += velocity.z;
        player.position.y += velocity.y;

        // Collision sol simple (Amélioration pour le saut infini)
        let groundLevel = 0;
        if (player.position.y < groundLevel) {
            player.position.y = groundLevel;
            velocity.y = 0;
            canJump = true; // On ne peut sauter que si on touche le sol
        }

        // Saut
        if (keys['Space'] && canJump) {
            velocity.y = JUMP_FORCE;
            canJump = false; // Désactive le saut jusqu'au prochain contact sol
        }

        // Interaction tableau
        if (!inLevel && player.position.distanceTo(painting.position) < 4) {
            if (keys['KeyE']) enterLevel();
        }
    }

    function enterLevel() {
        inLevel = true;
        scene.background = new THREE.Color(0x111111);
        painting.material.color.set(0xff0000);
        player.position.set(0, 5, 0);
    }

    function updateCamera() {
        // Caméra troisième personne fluide
        const dist = 8;
        const height = 4;
        
        const offset = new THREE.Vector3(
            Math.sin(mouseX) * dist * Math.cos(mouseY),
            Math.sin(mouseY) * dist + height,
            Math.cos(mouseX) * dist * Math.cos(mouseY)
        );

        camera.position.copy(player.position).add(offset);
        camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);
    }

    function animate() {
        requestAnimationFrame(animate);
        updatePhysics();
        updateCamera();
        
        // Animation du personnage (rotation vers la direction de marche)
        if (Math.abs(velocity.x) > 0.01 || Math.abs(velocity.z) > 0.01) {
            const targetRotation = Math.atan2(velocity.x, velocity.z);
            player.rotation.y = targetRotation;
        }

        renderer.render(scene, camera);
        
        // Update FPS HUD
        document.getElementById('fps').textContent = "64"; // Clin d'œil au titre
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
</script>
