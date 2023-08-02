function lerp({ x, y }, { x: targetX, y: targetY }) {
    const fraction = 0.1;

    x += (targetX - x) * fraction;
    y += (targetY - y) * fraction;

    return { x, y };
}

class Slider {
    constructor(el) {
        const imgClass = this.IMG_CLASS = 'slider__images-item';
        const textClass = this.TEXT_CLASS = 'slider__text-item';
        const activeImgClass = this.ACTIVE_IMG_CLASS = `${imgClass}--active`;
        const activeTextClass = this.ACTIVE_TEXT_CLASS = `${textClass}--active`;

        this.el = el;
        this.contentEl = document.getElementById('slider-content');
        this.onMouseMove = this.onMouseMove.bind(this);

        // taking advantage of the live nature of 'getElement...' methods
        this.activeImg = el.getElementsByClassName(activeImgClass);
        this.activeText = el.getElementsByClassName(activeTextClass);
        this.images = el.getElementsByTagName('img');

        document.getElementById('slider-dots')
            .addEventListener('click', this.onDotClick.bind(this));

        document.getElementById('left')
            .addEventListener('click', this.prev.bind(this));

        document.getElementById('right')
            .addEventListener('click', this.next.bind(this));

        window.addEventListener('resize', this.onResize.bind(this));

        this.onResize();

        this.length = this.images.length;
        this.lastX = this.lastY = this.targetX = this.targetY = 0;
    }
    onResize() {
        const htmlStyles = getComputedStyle(document.documentElement);
        const mobileBreakpoint = htmlStyles.getPropertyValue('--mobile-bkp');

        const isMobile = this.isMobile = matchMedia(
            `only screen and (max-width: ${mobileBreakpoint})`
        ).matches;

        this.halfWidth = innerWidth / 2;
        this.halfHeight = innerHeight / 2;
        this.zDistance = htmlStyles.getPropertyValue('--z-distance');

        if (!isMobile && !this.mouseWatched) {
            this.mouseWatched = true;
            this.el.addEventListener('mousemove', this.onMouseMove);
            this.el.style.setProperty(
                '--img-prev',
                `url(${this.images[+this.activeImg[0].dataset.id - 1].src})`
            );
            this.contentEl.style.setProperty('transform', `translateZ(${this.zDistance})`);
        } else if (isMobile && this.mouseWatched) {
            this.mouseWatched = false;
            this.el.removeEventListener('mousemove', this.onMouseMove);
            this.contentEl.style.setProperty('transform', 'none');
        }
    }
    getMouseCoefficients({ pageX, pageY } = {}) {
        const halfWidth = this.halfWidth;
        const halfHeight = this.halfHeight;
        const xCoeff = ((pageX || this.targetX) - halfWidth) / halfWidth;
        const yCoeff = (halfHeight - (pageY || this.targetY)) / halfHeight;

        return { xCoeff, yCoeff }
    }
    onMouseMove({ pageX, pageY }) {
        this.targetX = pageX;
        this.targetY = pageY;

        if (!this.animationRunning) {
            this.animationRunning = true;
            this.runAnimation();
        }
    }
    runAnimation() {
        if (this.animationStopped) {
            this.animationRunning = false;
            return;
        }

        const maxX = 10;
        const maxY = 10;

        const newPos = lerp({
            x: this.lastX,
            y: this.lastY
        }, {
            x: this.targetX,
            y: this.targetY
        });

        const { xCoeff, yCoeff } = this.getMouseCoefficients({
            pageX: newPos.x,
            pageY: newPos.y
        });

        this.lastX = newPos.x;
        this.lastY = newPos.y;

        this.positionImage({ xCoeff, yCoeff });

        this.contentEl.style.setProperty('transform', `
        translateZ(${this.zDistance})
        rotateX(${maxY * yCoeff}deg)
        rotateY(${maxX * xCoeff}deg)
      `);

        if (this.reachedFinalPoint) {
            this.animationRunning = false;
        } else {
            requestAnimationFrame(this.runAnimation.bind(this));
        }
    }
    get reachedFinalPoint() {
        const lastX = ~~this.lastX;
        const lastY = ~~this.lastY;
        const targetX = this.targetX;
        const targetY = this.targetY;

        return (lastX == targetX || lastX - 1 == targetX || lastX + 1 == targetX)
            && (lastY == targetY || lastY - 1 == targetY || lastY + 1 == targetY);
    }
    positionImage({ xCoeff, yCoeff }) {
        const maxImgOffset = 1;
        const currentImage = this.activeImg[0].children[0];

        currentImage.style.setProperty('transform', `
        translateX(${maxImgOffset * -xCoeff}em)
        translateY(${maxImgOffset * yCoeff}em)
      `);
    }
    onDotClick({ target }) {
        if (this.inTransit) return;

        const dot = target.closest('.slider__nav-dot');

        if (!dot) return;

        const nextId = dot.dataset.id;
        const currentId = this.activeImg[0].dataset.id;

        if (currentId == nextId) return;

        this.startTransition(nextId);
    }
    transitionItem(nextId) {
        function onImageTransitionEnd(e) {
            e.stopPropagation();

            nextImg.classList.remove(transitClass);

            self.inTransit = false;

            this.className = imgClass;
            this.removeEventListener('transitionend', onImageTransitionEnd);
        }

        const self = this;
        const el = this.el;
        const currentImg = this.activeImg[0];
        const currentId = currentImg.dataset.id;
        const imgClass = this.IMG_CLASS;
        const textClass = this.TEXT_CLASS;
        const activeImgClass = this.ACTIVE_IMG_CLASS;
        const activeTextClass = this.ACTIVE_TEXT_CLASS;
        const subActiveClass = `${imgClass}--subactive`;
        const transitClass = `${imgClass}--transit`;
        const nextImg = el.querySelector(`.${imgClass}[data-id='${nextId}']`);
        const nextText = el.querySelector(`.${textClass}[data-id='${nextId}']`);

        let outClass = '';
        let inClass = '';

        this.animationStopped = true;

        nextText.classList.add(activeTextClass);

        el.style.setProperty('--from-left', nextId);

        currentImg.classList.remove(activeImgClass);
        currentImg.classList.add(subActiveClass);

        if (currentId < nextId) {
            outClass = `${imgClass}--next`;
            inClass = `${imgClass}--prev`;
        } else {
            outClass = `${imgClass}--prev`;
            inClass = `${imgClass}--next`;
        }

        nextImg.classList.add(outClass);

        requestAnimationFrame(() => {
            nextImg.classList.add(transitClass, activeImgClass);
            nextImg.classList.remove(outClass);

            this.animationStopped = false;
            this.positionImage(this.getMouseCoefficients());

            currentImg.classList.add(transitClass, inClass);
            currentImg.addEventListener('transitionend', onImageTransitionEnd);
        });

        if (!this.isMobile)
            this.switchBackgroundImage(nextId);
    }
    startTransition(nextId) {
        function onTextTransitionEnd(e) {
            if (!e.pseudoElement) {
                e.stopPropagation();

                requestAnimationFrame(() => {
                    self.transitionItem(nextId);
                });

                this.removeEventListener('transitionend', onTextTransitionEnd);
            }
        }

        if (this.inTransit) return;

        const activeText = this.activeText[0];
        const backwardsClass = `${this.TEXT_CLASS}--backwards`;
        const self = this;

        this.inTransit = true;

        activeText.classList.add(backwardsClass);
        activeText.classList.remove(this.ACTIVE_TEXT_CLASS);
        activeText.addEventListener('transitionend', onTextTransitionEnd);

        requestAnimationFrame(() => {
            activeText.classList.remove(backwardsClass);
        });
    }
    next() {
        if (this.inTransit) return;

        let nextId = +this.activeImg[0].dataset.id + 1;

        if (nextId > this.length)
            nextId = 1;

        this.startTransition(nextId);
    }
    prev() {
        if (this.inTransit) return;

        let nextId = +this.activeImg[0].dataset.id - 1;

        if (nextId < 1)
            nextId = this.length;

        this.startTransition(nextId);
    }
    switchBackgroundImage(nextId) {
        function onBackgroundTransitionEnd(e) {
            if (e.target === this) {
                this.style.setProperty('--img-prev', imageUrl);
                this.classList.remove(bgClass);
                this.removeEventListener('transitionend', onBackgroundTransitionEnd);
            }
        }

        const bgClass = 'slider--bg-next';
        const el = this.el;
        const imageUrl = `url(${this.images[+nextId - 1].src})`;

        el.style.setProperty('--img-next', imageUrl);
        el.addEventListener('transitionend', onBackgroundTransitionEnd);
        el.classList.add(bgClass);
    }
}

const sliderEl = document.getElementById('slider');
const slider = new Slider(sliderEl);

// ------------------ Demo stuff ------------------------ //

let timer = 0;

function autoSlide() {
    requestAnimationFrame(() => {
        slider.next();
    });

    timer = setTimeout(autoSlide, 5000);
}

function stopAutoSlide() {
    clearTimeout(timer);

    this.removeEventListener('touchstart', stopAutoSlide);
    this.removeEventListener('mousemove', stopAutoSlide);
}

sliderEl.addEventListener('mousemove', stopAutoSlide);
sliderEl.addEventListener('touchstart', stopAutoSlide);

timer = setTimeout(autoSlide, 2000);

// -----------------------*tab---------------------
var tabLinks = document.getElementsByClassName('tab-links');
var tabContents = document.getElementsByClassName('tab-contents');

function openTab(tabName) {

    for (let tabLink of tabLinks) {
        tabLink.classList.remove("active-link");
    }

    for (let tabContent of tabContents) {
        tabContent.classList.remove("active-tab");
    }

    event.currentTarget.classList.add('active-link');
    document.getElementById(tabName).classList.add('active-tab');
}
// ----------------------------------------second fire----------------------

let renderer,
    scene,
    camera,
    sphereBg,
    nucleus,
    stars,
    controls,
    container = document.getElementById("canvas_container"),
    timeout_Debounce,
    noise = new SimplexNoise(),
    cameraSpeed = 0,
    blobScale = 3;


init();
animate();


function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 1000)
    camera.position.set(0, 0, 230);

    const directionalLight = new THREE.DirectionalLight("#fff", 2);
    directionalLight.position.set(0, 50, -20);
    scene.add(directionalLight);

    let ambientLight = new THREE.AmbientLight("#ffffff", 1);
    ambientLight.position.set(0, 20, 20);
    scene.add(ambientLight);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    //OrbitControl
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 4;
    controls.maxDistance = 350;
    controls.minDistance = 150;
    controls.enablePan = false;

    const loader = new THREE.TextureLoader();
    const textureSphereBg = loader.load('https://m.media-amazon.com/images/I/51eYm-8a1mS._AC_UF350,350_QL80_.jpg');
    const texturenucleus = loader.load('https://i.pinimg.com/originals/ab/50/4d/ab504d5fa01c287c03fd96c635fcdb43.jpg');
    const textureStar = loader.load("https://i.ibb.co/ZKsdYSz/p1-g3zb2a.png");
    const texture1 = loader.load("https://webdesigndev.com/wp-content/uploads/2015/07/Freepik.jpg");
    const texture2 = loader.load("https://www.brixton.net/wp-content/uploads/2022/11/iStock-1418483117-1024x524.jpg");
    const texture4 = loader.load("https://t3.ftcdn.net/jpg/02/14/53/92/360_F_214539232_YnUrtuwUEt84gHuU0qG8l7OwZvH4rnPG.jpg");


    /*  Nucleus  */
    texturenucleus.anisotropy = 16;
    let icosahedronGeometry = new THREE.IcosahedronGeometry(30, 10);
    let lambertMaterial = new THREE.MeshPhongMaterial({ map: texturenucleus });
    nucleus = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    scene.add(nucleus);


    /*    Sphere  Background   */
    textureSphereBg.anisotropy = 16;
    let geometrySphereBg = new THREE.SphereBufferGeometry(150, 40, 40);
    let materialSphereBg = new THREE.MeshBasicMaterial({
        side: THREE.BackSide,
        map: textureSphereBg,
    });
    sphereBg = new THREE.Mesh(geometrySphereBg, materialSphereBg);
    scene.add(sphereBg);


    /*    Moving Stars   */
    let starsGeometry = new THREE.Geometry();

    for (let i = 0; i < 50; i++) {
        let particleStar = randomPointSphere(150);

        particleStar.velocity = THREE.MathUtils.randInt(50, 200);

        particleStar.startX = particleStar.x;
        particleStar.startY = particleStar.y;
        particleStar.startZ = particleStar.z;

        starsGeometry.vertices.push(particleStar);
    }
    let starsMaterial = new THREE.PointsMaterial({
        size: 5,
        color: "#ffffff",
        transparent: true,
        opacity: 0.8,
        map: textureStar,
        blending: THREE.AdditiveBlending,
    });
    starsMaterial.depthWrite = false;
    stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);


    /*    Fixed Stars   */
    function createStars(texture, size, total) {
        let pointGeometry = new THREE.Geometry();
        let pointMaterial = new THREE.PointsMaterial({
            size: size,
            map: texture,
            blending: THREE.AdditiveBlending,
        });

        for (let i = 0; i < total; i++) {
            let radius = THREE.MathUtils.randInt(149, 70);
            let particles = randomPointSphere(radius);
            pointGeometry.vertices.push(particles);
        }
        return new THREE.Points(pointGeometry, pointMaterial);
    }
    scene.add(createStars(texture1, 15, 20));
    scene.add(createStars(texture2, 5, 5));
    scene.add(createStars(texture4, 7, 5));


    function randomPointSphere(radius) {
        let theta = 2 * Math.PI * Math.random();
        let phi = Math.acos(2 * Math.random() - 1);
        let dx = 0 + (radius * Math.sin(phi) * Math.cos(theta));
        let dy = 0 + (radius * Math.sin(phi) * Math.sin(theta));
        let dz = 0 + (radius * Math.cos(phi));
        return new THREE.Vector3(dx, dy, dz);
    }
}


function animate() {

    //Stars  Animation
    stars.geometry.vertices.forEach(function (v) {
        v.x += (0 - v.x) / v.velocity;
        v.y += (0 - v.y) / v.velocity;
        v.z += (0 - v.z) / v.velocity;

        v.velocity -= 0.3;

        if (v.x <= 5 && v.x >= -5 && v.z <= 5 && v.z >= -5) {
            v.x = v.startX;
            v.y = v.startY;
            v.z = v.startZ;
            v.velocity = THREE.MathUtils.randInt(50, 300);
        }
    });


    //Nucleus Animation
    nucleus.geometry.vertices.forEach(function (v) {
        let time = Date.now();
        v.normalize();
        let distance = nucleus.geometry.parameters.radius + noise.noise3D(
            v.x + time * 0.0005,
            v.y + time * 0.0003,
            v.z + time * 0.0008
        ) * blobScale;
        v.multiplyScalar(distance);
    })
    nucleus.geometry.verticesNeedUpdate = true;
    nucleus.geometry.normalsNeedUpdate = true;
    nucleus.geometry.computeVertexNormals();
    nucleus.geometry.computeFaceNormals();
    nucleus.rotation.y += 0.002;


    //Sphere Beckground Animation
    sphereBg.rotation.x += 0.002;
    sphereBg.rotation.y += 0.002;
    sphereBg.rotation.z += 0.002;


    controls.update();
    stars.geometry.verticesNeedUpdate = true;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}



/*     Resize     */
window.addEventListener("resize", () => {
    clearTimeout(timeout_Debounce);
    timeout_Debounce = setTimeout(onWindowResize, 80);
});
function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}
//------------------------*our project*--------------------------
// (async () => {
//     await loadPolygonPath(tsParticles);
  
//     await tsParticles.load({
//       particles: {
//         color: {
//           value: "#FF0000",
//           animation: {
//             enable: true,
//             speed: 10
//           }
//         },
//         move: {
//           attract: {
//             enable: false,
//             distance: 100,
//             rotate: {
//               x: 2000,
//               y: 2000
//             }
//           },
//           direction: "none",
//           enable: true,
//           outModes: {
//             default: "destroy"
//           },
//           path: {
//             clamp: false,
//             enable: true,
//             delay: {
//               value: 0
//             },
//             generator: "polygonPathGenerator",
//             options: {
//               sides: 6,
//               turnSteps: 30,
//               angle: 30
//             }
//           },
//           random: false,
//           speed: 3,
//           straight: false,
//           trail: {
//             fillColor: "#000",
//             length: 20,
//             enable: true
//           }
//         },
//         number: {
//           density: {
//             enable: true,
//             area: 1000
//           },
//           value: 0
//         },
//         opacity: {
//           value: 1
//         },
//         shape: {
//           type: "circle"
//         },
//         size: {
//           value: 2
//         }
//       },
//       background: {
//         color: " #0000"
      
//       },
//       fullScreen: {
//         zIndex: -1
//       },
//       emitters: {
//         direction: "none",
//         rate: {
//           quantity: 1,
//           delay: 0.25
//         },
//         size: {
//           width: 0,
//           height: 0
//         },
//         position: {
//           x: 50,
//           y: 50
//         }
//       }
//     });
//   })();
  

  
  