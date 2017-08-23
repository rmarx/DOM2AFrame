// ACCORDION
$(document).ready(function() {
  $("#accordion section h1").click(function(e) {
    $(this).parent().siblings("section").addClass("ac_hidden");
    $(this).parents("section").removeClass("ac_hidden");

    console.log("Accordion section clicked!", this);

    Log.ResetUpdateLoop();

    /*
    $("#accordion section h1").each(function(index){
      let el = this;
    console.log("Trying to trigger transition", el);
      if( el.d2aelement ){
        console.error("HOLOGRAM ACCORDION CUSTOM TRIGGER TRANSITION!", el);
        el.d2aelement.StartAnimation(e);
      }
    });
    */
    
    
    if( this.d2aelement ){
        //console.error("HOLOGRAM ACCORDION CUSTOM TRIGGER TRANSITION!", this);
        this.d2aelement.StartAnimation(e);
        
        // force update all the sections and their children so our transition's final state is always consistent (even if the transition itself can be inconsistent with the DOM state) 
        let self = this;
        this.addEventListener("transitionend",   () => {
          /*
          $("#accordion section, #accordion section *").each(function(index){
            let el = this;
            console.log("Trying to force update on all accordion sections", el);
            if( el.d2aelement ){
              el.d2aelement.Update(true, true);
            }
          });
          */
        });
    }
    

    e.preventDefault();
  });
});

// HOLOGRAM : http://unboring.net/workflows/animation.html 
/*
MIT License

Copyright (c) 2016 Arturo Paracuellos

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

let holograms = new Array();

class HologramData {
  constructor() {
    this.action = {};
    this.activeActionName = "idle";
    this.loaded = false;
    this.character = undefined;

    this.mixer = undefined;
    this.rotating = false;

    this.arrAnimations = [
      'idle',
      'walk',
      'run',
      'hello'
    ];
    this.actualAnimation = 0;

    this.textureLoader = new THREE.TextureLoader();
    this.loader = new THREE.JSONLoader();
  }

  LoadAndAppend(threeScene, loadedCallback = undefined) {

    console.error("Loading Hologram!");

    let self = this;
    this.loader.load('./files/models/eva-animated.json', function (geometry, materials) {
      self.OnMeshLoaded(geometry, materials, loadedCallback);
    });

  } // Load

  OnMeshLoaded(geometry, materials, loadedCallback){
      materials.forEach(function (material) {
        material.skinning = true;
        material.opacity = 0.7;
        material.transparent = true;
      });

      this.character = new THREE.SkinnedMesh(geometry, new THREE.MeshFaceMaterial(materials));
      this.character.position.set(0, 0.5, 0);

      this.mixer = new THREE.AnimationMixer(this.character);

      this.action.hello = this.mixer.clipAction(geometry.animations[0]);
      this.action.idle = this.mixer.clipAction(geometry.animations[1]);
      this.action.run = this.mixer.clipAction(geometry.animations[3]);
      this.action.walk = this.mixer.clipAction(geometry.animations[4]);

      this.action.hello.setEffectiveWeight(1);
      this.action.idle.setEffectiveWeight(1);
      this.action.run.setEffectiveWeight(1);
      this.action.walk.setEffectiveWeight(1);

      this.action.hello.setLoop(THREE.LoopOnce, 0);
      this.action.hello.clampWhenFinished = true;

      this.action.hello.enabled = true;
      this.action.idle.enabled = true;
      this.action.run.enabled = true;
      this.action.walk.enabled = true; 

      this.loaded = true;
      
      this.action.idle.play();

      if( loadedCallback )
        loadedCallback(this);
  } // OnMeshLoaded
  
  FadeAction(name) {
    var from = this.action[this.activeActionName].play();
    var to = this.action[name].play();

    from.enabled = true;
    to.enabled = true;

    if (to.loop === THREE.LoopOnce) {
      to.reset();
    }

    from.crossFadeTo(to, 0.3);
    this.activeActionName = name;
  }


} // HologramData

class HologramScene {

  constructor(holograms) {
    this.holograms = holograms;
    this.mylatesttap = undefined;
    this.CreateScene();
  }

  CreateScene() {

    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor( 0xFF0000, 0); 
    //this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.container = document.getElementById('hologramCanvas');
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(60, this.container.offsetWidth / this.container.offsetHeight, 0.1, 1000);
    this.camera.position.set(0, 0.8, 2.6);
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    //this.controls = new THREE.OrbitControls(camera, renderer.domElement);
    //this.controls.target = new THREE.Vector3(0, 0.6, 0);

    // Lights
    this.light = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(this.light);

    
    window.addEventListener('resize', this.OnWindowResize.bind(this), false);
    //window.addEventListener('click', this.OnDoubleClick.bind(this), false);
    this.Animate();

  }

  OnWindowResize() {
    //this.camera.aspect = this.container.width / this.container.height;
    //this.camera.updateProjectionMatrix();

    //this.renderer.setSize(this.container.width, this.container.height);
  }

/*
  OnDoubleClick() {
    var now = new Date().getTime();
    var timesince = now - this.mylatesttap;
    if ((timesince < 600) && (timesince > 0)) {

      for( let hologram of this.holograms){
        if (hologram.actualAnimation == hologram.arrAnimations.length - 1) {
          hologram.actualAnimation = 0;
        } else {
          hologram.actualAnimation++;
        }
        hologram.FadeAction(hologram.arrAnimations[hologram.actualAnimation]);
      }

    } else {
      // too much time to be a doubletap
    }

    this.mylatesttap = new Date().getTime();
  }
  */



  Animate() {
    requestAnimationFrame( this.Animate.bind(this) );
    //this.controls.update();
    this.Render();

  }

  Render() {
    var delta = this.clock.getDelta();

    for( let hologram of this.holograms ){
      if( hologram.loaded )
        hologram.mixer.update(delta);

        if( hologram.rotating )
          hologram.character.rotateY((45 * Math.PI/180) * delta);
    }

    this.renderer.render(this.scene, this.camera);
  }
}






