class Position{

	get DOM2AFrameScalingFactor()
	{
        // this.scalingFactor is supposed to be  DOM2Aframe.settings.DOMPixelsPerUnit
		// we divide 1 by pixels_per_unit to get someting we can directly multiply with DOM coordinates to get AFrame coordaintes
		// because: 25 pixels per unit = 25 pixels per meter -> 1 pixel = 1/25 meters
		// so DOMPosition (in pixels) * DOM2AFrameScalingFactor (pixels per meter) = AFramePosition (in meters)

		return 1 / this.DOMPixelsPerUnit;
	}

    constructor(DOMPosition, depthModifier, DOMPixelsPerUnit){
		this.depthModifier = depthModifier;
        this.DOMPixelsPerUnit = DOMPixelsPerUnit;
		this.UpdateFromDOMPosition(DOMPosition);
    }

	UpdateFromDOMPosition(DOMPosition){
		this.DOMPosition = DOMPosition;
		this.AFramePosition = this.CalculateAFramePosition(this.DOMPosition);
		this.AFramePosition.z = this.depthModifier;
	}

	CalculateAFramePosition(DOMPosition){
		// DOMPosition is the return value of domelement.getBoundingClientRect();
		// it has fields .top, .bottom, .left and .right
        // in the DOM, the origin is on the TOP LEFT
        
        if( !this.DOMPixelsPerUnit )
            console.error("position:DOMPixelsPerUnit not set!!", this);

		// AFramePosition needs to be in the AFrame coordinate system, which uses x, y and z values and a local origin/pivot at the CENTER of the element
		// In our setup, we just convert into x and y from width and height and keep the "global origin is on the TOP LEFT" idea
		// we put all the elements in a container entity that is then correctly positioned, so we don't have to worry about world-scale positioning or changing of y-axis logic here
		let output = {};
		output.z = 0; // TODO: take into account CSS z-index or other set attributes... will muck up the API a bit though

		let width = DOMPosition.right - DOMPosition.left;
		let height = DOMPosition.bottom - DOMPosition.top; // bottom - top because positive y-axis is pointing DOWN in the DOM, so bottom always > top

		output.x = DOMPosition.left + width/2;
		output.y = DOMPosition.top + height/2; 

		// at this moment, our coordinates are in DOM-scale, which means 1 unit = 1 pixel
		// however, in AFrame, 1 unit = 1 meter and we don't want to directly map 1 pixel = 1 meter of course
		// so, we apply a scaling factor (calculated elsewhere) to bring x, y and z into proper AFrame measures
		output.x *= this.DOM2AFrameScalingFactor;
		output.y *= this.DOM2AFrameScalingFactor * -1; // -1 because AFrame has the y-axis pointing upwards
		output.z *= this.DOM2AFrameScalingFactor; // future proofing the code

		output.width = width * this.DOM2AFrameScalingFactor;
        output.height = height * this.DOM2AFrameScalingFactor; 
        
        if( isNaN(output.x) || isNaN(output.y) )
            console.error("NAN found in position!", output);

		return output;
	}

	get x(){
		return this.AFramePosition.x;
	}

	get y(){
		return this.AFramePosition.y;
	}

	get z(){
		return this.AFramePosition.z;
	}

	get width(){
		return this.AFramePosition.width;
	}

	get height(){
		return this.AFramePosition.height;
	}

	get xyz(){
		return {x: this.x, y: this.y, z: this.z};
	}

    get left(){
        return {x: this.x - this.width / 2, y: this.y, z: this.z};
    }

    get right(){
        return {x: this.x + this.width / 2, y: this.y, z: this.z};
    }

    get top(){
        return {x: this.x, y: this.y + this.height / 2, z: this.z};
    }

    get bottom(){
        return {x: this.x, y: this.y - this.height / 2, z: this.z};
    }

	EqualsDOMPosition(DOMPosition){
        return 	this.DOMPosition.top 	== DOMPosition.top && 
				this.DOMPosition.bottom == DOMPosition.bottom && 
				this.DOMPosition.left 	== DOMPosition.left && 
				this.DOMPosition.right 	== DOMPosition.right;
	}
}

class Element{
	constructor(DOM2AFrame, domelement, layer){
        this.DOM2AFrame = DOM2AFrame;

		this.domelement = domelement;
        this.domelement.d2aelement = this; // so we can do a reverse lookup if need be (not used by our core setup, but handy for debugging)
		this.aelement = null; // is supposed to be filled in by object creator or, more usually, a subclass constructor

        this.parts = new Set(); // an Element can be composed of other elements (see for example TextElement, which has a background Container and a foreground Text)

        this.position = new Position( this.domelement.getBoundingClientRect(), layer, this.DOM2AFrame.settings.DOMPixelsPerUnit );

        this.cache = new PropertyCache();
        this.cache.Register("color");
        this.cache.Register("opacity");
        this.cache.Register("visibility");
        this.cache.Register("display");

        //Flag for when we need to redraw
        this._dirty = false;
        this.animating = false;
	}

    // supposed to be called in the ctor of inheriting elements after their .aelement has been assigned
    SetupEventHandlers()
    {
        if( !this.aelement ){
            alert("BaseElement:SetupEventHandlers : requires .aelement to be assigned!");
            return;
        }

        this.aelement.setAttribute("class", this.DOM2AFrame.settings.interactableObjectsTag);

        this.mouseEventHandler = new MouseEventHandler(this);

        //Listenes for direct css changes
        // note: attributeOldValue doesn't seem to work for style updates... chucks
        this.mutationObserver = new MutationObserver(this.HandleMutation.bind(this));
        this.mutationObserver.observe( this.domelement, { attributes: true, childList: false,   characterData: true, subtree: false /*, attributeOldValue : true*/ });
        //(new MutationObserver(this.DOM2AFrame.UpdateAll.bind(this.DOM2AFrame))).observe(    this.domelement, { attributes: true, childList: false,  characterData: true, subtree: false });



        this.domelement.addEventListener("eventListenerAdded", this.HandleEventListenerAdded.bind(this));
        this.domelement.addEventListener("eventListenerRemoved", this.HandleEventListenerRemoved.bind(this));

        //Listenes for css animations
        this.domelement.addEventListener("animationstart",  this.StartAnimation.bind(this));
        this.domelement.addEventListener("animationend",    this.StopAnimation.bind(this));

        //Listenes for transition changes, only works on Microsoft Edge and should work on FF but not Chrome https://developer.mozilla.org/en-US/docs/Web/Events/transitionstart#Browser_compatibility
        this.domelement.addEventListener("transitionstart", this.StartAnimation.bind(this));
        
        //This does work on chrome and other browsers: https://developer.mozilla.org/en-US/docs/Web/Events/transitionend
        this.domelement.addEventListener("transitionend",   this.StopAnimation.bind(this));
        
        // for form elements 
        let self = this;
        this.domelement.addEventListener("input", (evt) => { 
            if( evt.target == this.domelement )
               evt.stopPropagation();

            console.warn("input changed!"); 
            self.HandleMutation(); 
        });

        this.mouseEventHandler._resync(); // perform the initial sync to pick-up mouse handlers that might have been registered before this element // TODO: maybe move this to MouseEventHandler ctor instead?

        /*
        setTimeout( () => {
            //console.error("Setting up click handler on", this.aelement);
            //this.aelement.addEventListener("raycaster-intersected", function(){ console.log("INTERSECTED!"); });
            this.aelement.addEventListener('mouseenter', () => { console.log("mouse enter", this.aelement); });
            this.aelement.addEventListener("click", () => { console.log("CLICKED!", this.aelement, this.aelement.domelement); alert("Element clicked!"); }); 
        }, 1000);
        */
    }

    HandleEventListenerAdded(evt){
        //console.log("HandleEventListenerAdded", this, evt.detail, evt.target.eventListenerList);
        this.mouseEventHandler.HandleListenersAdded(evt);
    }

    HandleEventListenerRemoved(evt){
        //console.log("HandleEventListenerRemoved", this, evt.detail, evt.target.eventListenerList);
        this.mouseEventHandler.HandleListenersRemoved(evt);
    }

    StartAnimation(evt){
        console.log("ANIMATION STARTED", (evt.target == this.domelement), evt);
        if( evt.target == this.domelement )
            evt.stopPropagation();

        //this.StopIntervall();
        //this.interval = setInterval(this.UpdateAnimation.bind(this), 1000/this.DOM2AFrame.requestedFPS);
        this.animating = true;
        this.DOM2AFrame.StartAnimationLoop();
    }

    StopAnimation(evt){
        if( evt.target == this.domelement )
            evt.stopPropagation();

        // for example, in chrome we do get transitionEnd but not transitionStart
        // so we can get StopAnimation without actually having started the animation! 
        if( this.animating ){
            this.animating = false;
            this.DOM2AFrame.StopAnimationLoop();
        }
        //console.log("ANIMATION STOPPED", (evt.target == this.domelement), evt);
        //console.log("%c ANIMATION STOPPED", "background-color: red; color: white; font-size: 2em;");
        //console.error("ANIMATION STOPPED", this);

        //this.StopIntervall();
        //this.UpdateAnimation();

        // simply updating ourselves and children might not be enough
        // for now, we just go 2 levels up and update all those children
        // TODO: do this better! figure out what actually changed and only update that with a caching system, see also .Update()
        // FIXME: this won't even work because we don't add the d2aelements as children... damnit
        /*
        if( this.domelement.parentNode && this.domelement.parentNode.parentNode &&  this.domelement.parentNode.parentNode.d2aelement ){
            console.error("Force updating after animation 1: ", this.domelement.parentNode.parentNode);
            this.domelement.parentNode.parentNode.d2aelement.Update(true, true);
        }
        else if( this.domelement.parentNode && this.domelement.parentNode.d2aelement ){
            console.error("Force updating after animation 2: ", this.domelement.parentNode);
            this.domelement.parentNode.d2aelement.Update(true, true);
        }
        else{
            console.error("Force updating after animation 3: NOTHING!");
        }
        */

    }

    /*
    StopIntervall(){
        clearInterval(this.interval);            
    }
    */

    /*
    //Update for one Animation frame
    UpdateAnimation(){
        this.HandleMutation();
        //this.DOM2AFrame.UpdateAll();
        //UpdateAll.bind(this).call();
    }
    */

    get dirty()
    {
        return this._dirty;
    }
    set dirty(val)
    {
        this._dirty = val;
    }

    get AElement()
    {
        return this.aelement;
    }

    get DOMElement()
    {
        return this.domelement;
    }

    //Gets called on the object that invokes the whole update chain, which is garanteed to be dirty
    HandleMutation(mutation){
        Log.OnElementMutated(this, mutation);
        console.trace("%c HandleMutation triggered", "color: yellow; background-color: black;", mutation, this);
        this.dirty = true;
        //this.Update();
        //this.DOM2AFrame.state.dirty = true;
        this.DOM2AFrame.UpdateAll(); // TODO : FIXME: for now, we're bubbling up (so basically redrawing everything) but eventually we want to only update the changed parts and their children!
    }

    // called once after the element is fully mounted and the THREE.js renderer is coupled etc.
    Init(){
        this._SetupClipping();
        
        for( let part of this.parts )
            part.Init();
    }

    // update Phase 1 function
    // does the computationally complex browser calls (things that can trigger layouting and so need to be batched for best performance)
    // and compares the results to cached values to be used in Phase 2 (Update())
    UpdateCaches(){
        var DOMPosition = this.domelement.getBoundingClientRect();
        var element_style = window.getComputedStyle(this.domelement);

        this.cache.UpdateFromBoundingRect(DOMPosition, this.position);
        this.cache.UpdateFromComputedStyle(element_style);

        // TODO: we could also just do part.UpdateCaches() but that would re-calculate the bounding rect and computedstyle, while they are the same because the parts share our domelement
        // this should be quicker, BUT we introduce some sharing (parts no longer have their own caches) and we can't just do part.position = this.position because of this (since parts may want to update their positions, see for example how we handle Text alignment in TextElement)
        // so, we need to decide if part.cache = this.cache won't lead to strange behaviour in more complex cases later down the road
        for( let part of this.parts ){
            part.position.UpdateFromDOMPosition(DOMPosition);
            part.cache = this.cache; // TODO: move this to an AddPart() function or something
        }
    }

    Update(forceUpdate = false, updateParts = true){

        // we update the sub"Parts" here before the rest so we can override some of their behaviour in the main element if needed
        if(updateParts){
            for( let part of this.parts )
                part.Update(forceUpdate || this.dirty, updateParts); 
            //TODO: update this logic! the || this.dirty is a hack for now to force parts to update (e.g. positions stay the same but colors change) but this can still miss necessary updates in siblings or parents!
        }

        // we don't get Mutation events if it's just the position that has changed indirectly (due to a style change on another element for example)
        // so we also need to check if our current position and a select few styles are still valid and not only depend on this.dirty to make decisions 

        /*
        // todo: make this a much more generic cache! 
        let somethingChanged = false;
        if( !this.colorCache )
            this.colorCache = "";
        if( !this.opacityCache )
            this.opacityCache = "";

        if( element_style.getPropertyValue("color") != this.colorCache){
            this.colorCache = element_style.getPropertyValue("color");
            somethingChanged = true;
        }

        if( element_style.getPropertyValue("opacity") != this.opacityCache){
            this.opacityCache = element_style.getPropertyValue("opacity");
            somethingChanged = true;
        }
        //Check if something changed since last time, else we just stop the update
        if(this.position.EqualsDOMPosition(DOMPosition) && !somethingChanged && !this.animating && !this.dirty && !forceUpdate)
            return;
        */

        if( !this.cache.SomethingChanged() && !this.animating && !this.dirty && !forceUpdate)
            return;

        //if( !forceUpdate && !this.dirty )
        Log.OnElementUpdated(this, this.dirty, forceUpdate);

        //console.trace("UPDATE TRIGGERED ", Date.now(), this.domelement);

        //Cache the last position
        //this.position.UpdateFromDOMPosition(DOMPosition); // this is just the calculation: actual setting happens in the ElementSpecificUpdate to allow more fine-grained control
        
        let element_style = this.cache.computedStyle;

        /*
        //Set the opacity of the element
        // TODO: add these to cache? 
        var new_opacity = 0;
        if(element_style.getPropertyValue("visibility") !== "hidden" && element_style.getPropertyValue("display") !== "none")
            new_opacity = parseFloat( this.cache.GetValue("opacity") );
    	//this.aelement.setAttribute("opacity", "");
        this.aelement.setAttribute("opacity", new_opacity);
        */
        
        if(element_style.getPropertyValue("visibility") === "hidden" || element_style.getPropertyValue("display") === "none")
            this.aelement.setAttribute("visible", false);
        else
            this.aelement.setAttribute("visible", true);


        
        this.ElementSpecificUpdate(element_style);

        this.UpdateClipping();

        this.dirty = false;
    }

    // in BaseElement because shared by various elements, but not auto-called by Update() because not each element requires it
    UpdateBorders(element_style){
        
        // TODO: needed because THREE.BoxHelper doesn't automatically follow changes to the underlying mesh. Find some way to update the boxhelper without re-creating it every time
        // NOTE: this commented-out code didn't work... borders just disappear... *headdesk*
        // what is PROBABLY going wrong here:
        // - the BoxHelper is going to use the bounding box of the element in WORLD coordinates
        // - so plane is taken, bounding box calculated to be correct, placed in WORLD coordinates, added to the element with setObject3D
        //      -> this causes the object's bounding box to grow! since new 3D info is added way behind it (in our case: at z -30)
        // - on the next update, this is the new bounding box and the boxhelper is added for this bounding box (doesn't change shape because we're good in WORLD coords right now)
        // -> in practice, our borders are shifted to the back of the scene, seemingly invisible until we look with the a-frame inspector... derp
        // ! have confirmed that boxes do rotate! it's primarily the positioning that is bogus
        // TODO: try to add separate a-entity specifically for the borders and use that for positioning after the original initiationlization
            // -> BUT! this will not work when we start rotating planes? since this also messes with the bounding box? so we would need to keep a copy of the plane, Axis-aligned, update that, then update the borders, then rotate the borders... dude
            // -> first look into the proper border options, like 
            // FIRST: Helpers are designed to be added directly as children of the scene -- not as children of the target object, or any other object.
        /*
        if( !this.elWidthForBorders )
            this.elWidthForBorders = this.position.width;
        if( !this.elHeightForBorders )
            this.elHeightForBorders = this.position.height;

        if( this.elWidthForBorders != this.position.width || this.elHeightForBorders != this.position.height )
            this.borderObject = undefined;

        this.elWidthForBorders = this.position.width;
        this.elHeightForBorders = this.position.height;

        */

        
        // // TODO: make more efficient https://threejs.org/docs/#manual/introduction/How-to-update-things
		// if( !this.borderObject ){ 
		// 	let threePlane = this.aelement.object3D.children[0]; // without children[0], we would get the encompassing GROUP, which will position our borders erroneously

        //     /*
		// 	// this works, but linewidth isn't adjustable 
		// 	// TODO: change to https://stackoverflow.com/questions/11638883/thickness-of-lines-using-three-linebasicmaterial or https://stemkoski.github.io/Three.js/Outline.html 
		// 	var box = new THREE.BoxHelper( threePlane, 0x00ff00 );
		// 	box.material.lineWidth = 1; // for some reason, this doesn't work on windows platforms: https://threejs.org/docs/#api/materials/LineBasicMaterial
		// 	box.material.color = {r: 1, g: 1, b: 1};
		// 	box.material.needsUpdate = true;
		// 	//this.aelement.setObject3D('border', box);
        //     this.DOM2AFrame.AFrame.scene.object3D.add( box );
		// 	this.borderObject = box;
        //     */

        //     // https://threejs.org/docs/#api/geometries/EdgesGeometry
        //     var edges = new THREE.EdgesGeometry( threePlane.geometry );
        //     var line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xffffff } ) );
        //     //this.DOM2AFrame.AFrame.scene.object3D.add( line );
		// 	this.aelement.setObject3D('border', line);
        //     this.borderObject = line;

		// }
        // else
        //     this.borderObject.update(this.aelement.object3D.children[0]);

        // TODO: make more efficient https://threejs.org/docs/#manual/introduction/How-to-update-things

        let threePlane = this.aelement.object3D.children[0]; // without children[0], we would get the encompassing GROUP, which will position our borders erroneously

        // https://threejs.org/docs/#api/geometries/EdgesGeometry
        var edges = new THREE.EdgesGeometry( threePlane.geometry );
        var line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0x000000 } ) );
        this.aelement.setObject3D('border', line); // will auto-remove existing border object if any
        this.borderObject = line;

        if( this.clippingContext ){
            line.material.clipping = true;
            line.material.clippingPlanes = this.clippingContext.planes;
            line.material.needsUpdate = true;
        }

		
		let borderWidth = parseFloat(element_style.borderWidth);
        if( this.customBorder )
            borderWidth = this.customBorder.width;
		
		if( borderWidth == 0 ){
			this.borderObject.material.visible = false;
		}
		else{
			this.borderObject.material.visible = true;

			this.borderObject.material.lineWidth = borderWidth;

			// TODO: cache this value?
			// TODO: use decent Color class (e.g. the one from html2canvas, which this is based on)
            
            if( this.customBorder )
                this.borderObject.material.color = this.customBorder.color; 
            else{
                let colorRGB = element_style.borderColor;

                let _rgb = /^rgb\((\d{1,3}) *, *(\d{1,3}) *, *(\d{1,3})\)$/;
                let match = colorRGB.match(_rgb);
                if( match !== null ){
                    this.borderObject.material.color = {r: Number(match[1]) / 256, g: Number(match[2]) / 256, b: Number(match[3]) / 256};
                }
            }
		}
		
		this.borderObject.material.needsUpdate = true;
	}

    // ex. GetAsset("http://google.com/logo.png", "img")
    GetAsset(path, type){
        var assets = this.DOM2AFrame.AFrame.assets.getChildren();

        for (var i = 0; i < assets.length; i++)
            if (assets[i].getAttribute("src") === path)
                return assets[i].getAttribute("id");

        //Asset creation
        var asset = document.createElement(type);
        asset.setAttribute("src", path);
        var id = "asset-" + this.DOM2AFrame.state.getNextAssetID();
        asset.setAttribute("id", id);

        this.DOM2AFrame.AFrame.assets.appendChild(asset);

        return id;
    }

    _RotateNormal(normal){
        let originalNormal = normal.clone();

        let elementContainer = this.DOM2AFrame.AFrame.container.object3D;
        let normalMatrix = new THREE.Matrix3().getNormalMatrix( elementContainer.matrixWorld );
		let output = normal.clone().applyMatrix3( normalMatrix ).normalize();

        return output;
    }

    _GetClippingContext(){
        let output = undefined;

        // TODO: make sure that we always have a d2a path up to the clipping parent! i.e. if we skip certain dom elements but process their children, we still want to be able to get the clipping context! 
        if( this.domelement.parentNode && this.domelement.parentNode.d2aelement && this.domelement.parentNode.d2aelement.clippingContext ){
            // our parent node has clipping set : we just inherit
            output = this.domelement.parentNode.d2aelement.clippingContext;
        }
        else{
            var element_style = window.getComputedStyle(this.domelement);
            if( element_style.overflow && element_style.overflow == "hidden"){ // TODO: support other overflow types as well (scroll is going to be very difficult with this setup though...) 

                console.error("Found new clipping authority! ", this); 

                let clippingContext = {};
                clippingContext.authority = this;

                clippingContext.bottom = new THREE.Plane( this._RotateNormal(new THREE.Vector3(0,1,0)),  0); // normal pointing UP
                clippingContext.top    = new THREE.Plane( this._RotateNormal(new THREE.Vector3(0,-1,0)), 0); // normal pointing DOWN
                clippingContext.left   = new THREE.Plane( this._RotateNormal(new THREE.Vector3(1,0,0)),  0); // normal pointing RIGHT
                clippingContext.right  = new THREE.Plane( this._RotateNormal(new THREE.Vector3(-1,0,0)), 0); // normal pointing LEFT

                clippingContext.planes = [clippingContext.bottom, clippingContext.top, clippingContext.left, clippingContext.right];

                output = clippingContext;
            }
        }

        return output;
    }

    // needed for overflow
    _SetupClipping(){
        
        if( !this.DOM2AFrame.settings.clippingEnabled )
            return;

        // currently, we only support a single overflow context in a subtree
        // i.e. a container with overflow:hiddden set, cannot have children that also have overflow: hidden set 
        // to support that, we would have a seperate clippingContext per child, but also have children have the clippingPlanes of all their active clipping parents set (merger of different clipping plane arrays)
        // this is certianly possible, but too complex for our needs right now 

        // TODO: we currently don't support overflow settings changing at runtime! 

        let clippingContext = this._GetClippingContext();

        if( clippingContext ){

            this.clippingContext = clippingContext;

            // we are sure the renderer is loaded (DOM2AFrame only calls Update() after the element has a THREE.js equivalent loaded)
            let obj3d = this.aelement.object3D;
            if( !obj3d || !obj3d.children || !obj3d.children.length > 0 || !obj3d.children[0].material ){
                console.error("TextElement._SetupClipping: Trying to set clipping but no Three.js element known!", obj3d, this);
                return;
            }

            let material = obj3d.children[0].material; // in a-frame, all object3D's are a Group, even if they just have 1 child.

            // we need to set the clipping planes on all elements in the clipped subtree, since each element does its own clipping in their shader
            // however, the clippingContext is a reference value, so if we update these clipping plane definitions once (in the parent's Update), it will cascade to all these children as well
            material.clipping = true;
            material.clippingPlanes = clippingContext.planes;
            //material.clippingPlanes = [clippingContext.right, clippingContext.left, clippingContext.top];//[clippingContext.bottom];
            //material.clippingPlanes = [clippingContext.bottom, clippingContext.top];//, clippingContext.top, clippingContext.right];

            this.UpdateClipping(); // position the planes correctly for initialization
            setTimeout(() => { this.UpdateClipping(); }, 200); // for some reason, object3D hasn't been positioned correctly here and there is no a-frame event that allows us to listen for that... so HACK to correctly set clipping here
            material.needsUpdate = true;
        }
    }

    UpdateClipping(){

         // only the element with actual overflow set (the "authority") can change positioning of the clipping planes
         // NOTE: this means we currently only support a single authority in a given chain! see _SetupClipping()
        if( !this.clippingContext || this.clippingContext.authority != this )
            return;

        // TODO: we currently don't support overflow settings changing at runtime! (i.e. what if this overflow is suddenly no longer set to hidden?)


        // both this.aelement.object3D.position and this.position are the LOCAL positions! and are assumed to be the same at all times
        let threePosition = this.aelement.object3D.position;
        // do this in local space so we can just use the accustomed unit vectors to figure out up, down, left and right (y and x axes)
        let bottomLocal = threePosition.clone().add( (new THREE.Vector3(0, -1, 0)).multiplyScalar(this.position.height/2) );
        let topLocal    = threePosition.clone().add( (new THREE.Vector3(0,  1, 0)).multiplyScalar(this.position.height/2) );
        let leftLocal   = threePosition.clone().add( (new THREE.Vector3(-1, 0, 0)).multiplyScalar(this.position.width/2 ) );
        let rightLocal  = threePosition.clone().add( (new THREE.Vector3( 1, 0, 0)).multiplyScalar(this.position.width/2 ) );

        // let bottomPoint = this.DOM2AFrame.AFrame.container.object3D.localToWorld( bottomTranslationPoint.clone() );//this.aelement.object3D.localToWorld( bottomTranslationPoint.clone() );//new THREE.Vector3( this.position.x, this.position.y - (this.position.height/2), this.position.z ); 
        // let topPoint    = new THREE.Vector3( this.position.x, this.position.y + (this.position.height/2), this.position.z ); 
        // let leftPoint   = new THREE.Vector3( this.position.x - (this.position.width/2), this.position.y, this.position.z ); 
        // let rightPoint  = new THREE.Vector3( this.position.x + (this.position.width/2), this.position.y, this.position.z ); 

        // TODO: use the actual object3D's parent instead of the top-level container directly (only works because now we add everything as a direct child of the elementContainer!)
        let bottomGlobal    = this.DOM2AFrame.AFrame.container.object3D.localToWorld( bottomLocal.clone()   );
        let topGlobal       = this.DOM2AFrame.AFrame.container.object3D.localToWorld( topLocal.clone()      );
        let leftGlobal      = this.DOM2AFrame.AFrame.container.object3D.localToWorld( leftLocal.clone()     );
        let rightGlobal     = this.DOM2AFrame.AFrame.container.object3D.localToWorld( rightLocal.clone()    );
        

        // plane positions are in world position, and ours are relative to the AFrame top-level container, so we need to manually offset
        // TODO: make this more robust? allow any number of parents or get our world positions from the THREE.js object with proper world matrix? 
        //bottomPoint = bottomPoint.add(  this.DOM2AFrame.AFrame.container.object3D.position );
        //topPoint    = topPoint.add(     this.DOM2AFrame.AFrame.container.object3D.position );
        //leftPoint   = leftPoint.add(    this.DOM2AFrame.AFrame.container.object3D.position );
        //rightPoint  = rightPoint.add(   this.DOM2AFrame.AFrame.container.object3D.position );

        //let originalLocalBottomPoint = (new THREE.Vector3( this.position.x, this.position.y - (this.position.height/2), this.position.z ));
        //let originalBottomPoint = originalLocalBottomPoint.clone().add(  this.DOM2AFrame.AFrame.container.object3D.position );

        //console.error("Clipping setup points", threePosition, bottomTranslationPoint, originalLocalBottomPoint, bottomPoint, originalBottomPoint, this.aelement.object3D.matrixWorld );
        
        this.clippingContext.bottom.setFromNormalAndCoplanarPoint(   this._RotateNormal(new THREE.Vector3( 0, 1, 0 )), bottomGlobal   ).normalize();
        this.clippingContext.top.setFromNormalAndCoplanarPoint(      this._RotateNormal(new THREE.Vector3( 0, -1, 0 )), topGlobal     ).normalize();
        this.clippingContext.left.setFromNormalAndCoplanarPoint(     this._RotateNormal(new THREE.Vector3( 1, 0, 0 )), leftGlobal     ).normalize();
        this.clippingContext.right.setFromNormalAndCoplanarPoint(    this._RotateNormal(new THREE.Vector3( -1, 0, 0 )), rightGlobal   ).normalize();

        // DEBUG visualizations of the clipping planes
        if( this.DOM2AFrame.settings.debugClipping ){
            if( !this.clippingPlaneHelpers ){
                this.clippingPlaneHelpers = new Array();

                for( let plane of this.clippingContext.planes ){

                    let planeMaterial = new THREE.MeshLambertMaterial({color: 0xffff00, side: THREE.DoubleSide});
                    let geometry = new THREE.PlaneGeometry(10, 10);//new THREE.BoxGeometry(10, 10, 1);//new THREE.BoxGeometry(10, 1, 10);//new THREE.PlaneGeometry(10, 10);
                    let mesh = new THREE.Mesh(geometry, planeMaterial);

                    mesh.DEBUG_PLANE = plane;
                    this.clippingPlaneHelpers.push( mesh );

                    let axisHelper = new THREE.AxisHelper(5);
                    mesh.add( axisHelper );
                }

                for( let helper of this.clippingPlaneHelpers )
                    this.DOM2AFrame.AFrame.scene.object3D.add( helper );

                console.warn("Added plane helpers!", this.clippingPlaneHelpers);
            }

            for( let mesh of this.clippingPlaneHelpers ){
                
                mesh.visible = true;

                let worldPos = this.aelement.object3D.getWorldPosition(); // center of the object
                let myPoint = mesh.DEBUG_PLANE.projectPoint( worldPos ); // the clipping planes are already aligned to our world-pos sides, to we can just project the center onto them to get the edge points we need
                mesh.position.set( myPoint.x, myPoint.y, myPoint.z );

                // the clipping plane normals are "inverted" to what we want, so multiply by -1 to get the correct setup
                var focalPoint = myPoint.clone().add( mesh.DEBUG_PLANE.normal.clone().multiplyScalar(-1) );
                mesh.lookAt(focalPoint);
            }
        }
        else{
            if( this.clippingPlaneHelpers ){
                for( let mesh of this.clippingPlaneHelpers ){
                    mesh.visible = false;
                }
            }
        }


        this.aelement.object3D.children[0].material.needsUpdate = true; // TODO: shouldn't be needed! remove!
        
        //console.warn("Updating clipping : ", this.DOM2AFrame.AFrame.scene.renderer.localClippingEnabled, this.aelement.object3D.children[0].material.clippingPlanes, this.clippingContext.bottom, this.domelement);


        //     var dir = new THREE.Vector3(0,1,0);
        //     var centroid = new THREE.Vector3(containerPosition.x, containerPosition.y - (containerPosition.height / 2),containerPosition.z);
        //     centroid = centroid.add(DOM2AFrame1.AFrame.container.object3D.position); // in-place operation

        //    // alert( JSON.stringify(centroid.add(DOM2AFrame1.AFrame.container.object3D.position)) );
        //     var plane = new THREE.Plane();
        //     plane.setFromNormalAndCoplanarPoint(dir, centroid).normalize();

        //     let bottomPlane = plane; //new THREE.Plane( new THREE.Vector3( 0, 1, 0 ), containerBottomY );
        //     material.clippingPlanes = [bottomPlane];

        //     bottomClippingPlane = bottomPlane;

        //     box.setAttribute("position", centroid.x + " " + centroid.y + " " + centroid.z);

        //     material.needsUpdate = true;

    }
}