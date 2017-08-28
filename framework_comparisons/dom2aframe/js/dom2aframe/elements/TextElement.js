// TODO: make util function
function stripText(html){
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText;
}



class TextElement extends Element{
	constructor(DOM2AFrame, domelement, depth, registerEvents = true){
		super(DOM2AFrame, domelement, depth, registerEvents);

        // note, for text elements we want to build a compound setup to allow for background colors for the entity (in a-frame, something cannot have a background-color)
        // there are several ways to do this in a-frame, including an option to do it in a single tag:
        /*
		<a-entity
		geometry="primitive: plane; height: auto; width: auto"
		material="color: blue"
		text="width: 4; value: This text will be 4 units wide."></a-entity>
		*/
        // however, to keep things easy and clear, we will use a separate plane and text component inside an <a-entity> as container

        // note: this entity is just a dummy, positioned at 0,0,0 (relative to the parent container)
        // we don't actually use it to do positioning etc. of our real elements here, just to logically group them and add/delete them from the scene at the same time
        this.aelement = document.createElement("a-entity");

		//Make separate container and text element
		this.backgroundPlane = new ContainerElement(DOM2AFrame, domelement, depth - (this.DOM2AFrame.settings.layerStepSize/2), false); // background shouldn't register events, only our main a-text element (otherwise the same DOMElement would get double the events)
		this.atext = document.createElement("a-text");// new TextElement(domelement, depth);

		//this.atext.setAttribute("class", this.DOM2AFrame.settings.interactableObjectsTag); // shouldn't do this, since atext doesn't have a coupled .d2aelement and, consequently, no domelement to pass events on to
		this.backgroundPlane.AElement.setAttribute("class", this.DOM2AFrame.settings.interactableObjectsTag); // text catches most events, but apparently pointer-based stuff is mesh-bound and falls through gaps in the text? strange stuff here... beware! 

		//Add container and text to this entity
		this.aelement.appendChild(this.backgroundPlane.AElement );
		this.aelement.appendChild(this.atext );

        this.parts.add( this.backgroundPlane  );

        this.atext.setAttribute("align", "left"); 
		this.atext.setAttribute("anchor", "left"); // for some reason, anchor moves the pivot of the text element as well, but our coordinates are always relative to the CENTER 
		//this.atext.setAttribute("baseline", "top");

        //this.aelement.setAttribute("width", "auto");
        //this.aelement.setAttribute("height", "auto");

		//this.aelement = this.atext; // TODO: figure out repercussions! done this to get mouse events working! 
		
		//this.backgroundPlane.AElement.addEventListener("mouseenter", (evt) => { console.log("TextElement mouseenter!", this.domelement); });

		if( registerEvents )
			this.SetupEventHandlers();

		if( this.domelement.tagName == "A" ){
			// custom logic needed for an anchor
			// we just want to trigger a click event, so need to register a dummy click handler
			this.domelement.addEventListener("click", (evt) => { console.log("Link clicked!", this.domelement.getAttribute("href"), this.domelement); })
		}

		this.domelement.d2aelement = this; // ContainerElement also claimed itself as being the d2aelement, which is obviously wrong! 
    }

	ElementSpecificUpdate(element_style){

		// note: updating the backgroundPlane is done automatically because it is registered as a child of this element. We only need to deal with our own stuff here
        // note that parts are fully updated before their "parent", so we might override some stuff for the backgroundPlane here if we would need to

		this._UpdateTextAlignment(element_style);

		let textValue = undefined;
		// TODO: make this more generic using a plugin system/CalculateTextValue override (set in DOM2AFrame::AddDOMElement) to also support other elements in a more generic way
		if( this.domelement.tagName == "INPUT" && this.domelement.getAttribute("type") == "text" && this.domelement.getAttribute("value") )
			textValue = this.domelement.value;
		else
			textValue = stripText(this.domelement.innerHTML);

			
		//console.log("ElementSpecificUpdate TEXT ", textValue);

        //this.atext.setAttribute("text", "value: " + stripText(this.domelement.innerHTML) + ";");
        this.atext.setAttribute("text", "value", textValue ); // other inline syntax ("value: " + stripText(this.domelement.innerHTML) + ";") sometimes give strange errors, but only for long text... you go figure
		//this.atext.getAttribute("text").setAttribute("value", stripText(this.domelement.innerHTML));
		//this.atext.components["text"].value = stripText(this.domelement.innerHTML);

        let domColor = element_style.getPropertyValue("color");
		let opacity = parseFloat(element_style.getPropertyValue("opacity"));

		//if( opacity != 0 && opacity != 1)
		//		console.error("DOM COLOR ", domColor, opacity, textValue);

        // otherwhise they will show up as black + hiding them helps performance tremendously since they aren't drawn!!! (is the case for most containers -> just make sure to have 1 top-level container that is always drawn)
        if( domColor == this.DOM2AFrame.settings.transparantColor )
            this.atext.setAttribute("visible", false);
        else
        {
            this.atext.setAttribute("visible", true);

            let aColor = this.atext.getAttribute("color");
		    if( aColor != domColor )
            {
			    this.atext.setAttribute('color', domColor);
            }
        }

		this.atext.setAttribute("opacity", opacity);




		// we want to update text size, but this depends on if the font is loaded by this time or not (is an async operation)
		// getAttribute("text") doesn't give us access to the internal component data
		// .components["text"] does! w00t!
		let currentFont = this.atext.components["text"].currentFont;
		if( !currentFont ) 
		{
			let self = this;
			let handler = () => { self.atext.removeEventListener(handler); self._UpdateTextSize(element_style); };
			this.atext.addEventListener("textfontset", handler);
		}
		else
		{
			this._UpdateTextSize(element_style);
		}


	}

	_UpdateTextAlignment(element_style){

		// https://developer.mozilla.org/en-US/docs/Web/CSS/text-align
		let alignment = element_style.getPropertyValue("text-align");
		let anchor = "left";
		if( alignment == "center" )
			anchor = "center";
		else if( alignment == "right" )
			anchor = "right";
		else if( alignment == "left" )
			anchor = "left";
		else if(alignment == "start") // same as left if text-direction is left-to-right (which we assume for now) TODO: support right-to-left
			anchor = "left";
		else if( alignment == "end" ) // same as right if text-direction is left-to-right (which we assume for now) TODO: support right-to-left
			anchor = "right";
		else{
			anchor = "left";
			console.warn("TextElement:_UpdateTextAlignment : unsupported text alignment! ", alignment, this.domelement);
		}

		this.atext.setAttribute("anchor", anchor);
		this.atext.setAttribute("align", alignment);

        // need to do custom positioning here because anchoring text elements doesn't work properly (i.e. anchor center (as is default for other objects) and text-align left shifts the text way too far to the left)
        // so if we set our anchor to left and offset our calculated center-position (see the Position class), we account for this with correct positioning
 
		let xyz = this.position.xyz;
		if( anchor == "left" )
			xyz.x -= this.position.width / 2; // shift to the left to comply with the text anchor
		else if( anchor == "right" )
			xyz.x += this.position.width / 2; // shift to the right
		// if center, nothing to be done! 

		// TODO: make this more neat, now only works for baseline == "top"
		//xyz.y += (this.position.height / 2) * 0.85;

		// need to take into account top padding! (for some fluke reason, top padding is included in the getClientBoundingRect...)
		let paddingLeft = element_style.getPropertyValue("padding-left");
		xyz.x += parseFloat(paddingLeft) * this.position.DOM2AFrameScalingFactor;
		//let paddingTop = element_style.getPropertyValue("padding-top");
		//xyz.y -= parseFloat(paddingTop) * this.position.DOM2AFrameScalingFactor;

		xyz.z += this.DOM2AFrame.settings.layerStepSize; // move it slightly on top of the backgroundPlane

        this.atext.setAttribute("position", xyz );
	}

	_UpdateTextSize(element_style){

		let currentFont = this.atext.components["text"].currentFont;
		let referenceFontSize = currentFont.info.size; // the base fontsize A-Frame will use to determine wrapping

		// calculated font size is always in pixels! w00t!
		let actualFontSize = parseFloat(element_style.getPropertyValue("font-size"));
		let fontScalingFactor = referenceFontSize / actualFontSize; // if actual > reference, this will be < 1, > 1 otherwhise 

		let widthInPixels = this.position.width / this.position.DOM2AFrameScalingFactor;
		let wrapPixels = widthInPixels * fontScalingFactor;
		wrapPixels *= 1.075; // for some reason there is still a slight discrepancy with our calculations. This is needed to get at least single-line text to not wrap at the end... MAGIC NUMBER!
		
		this.atext.setAttribute("wrap-pixels", wrapPixels);
		this.atext.setAttribute( "width", this.position.width);
		
		//console.warn("Set wrappixels to ", wrapPixels, widthInPixels, fontScalingFactor, this.position.DOM2AFrameScalingFactor, this.position.width, actualFontSize, currentFont.info);

        //var textSizeInPixels = 1 / this.DOM2AFrame.settings.DOMPixelsPerUnit;  

		/*
        // TODO: explain this calculation
        var width = (textSizeInPixels * parseFloat(element_style.getPropertyValue("font-size"))) *22;//* 20;
        if(width != this.atext.getAttribute("width"))
		{
        	this.atext.setAttribute("width",width);
		}
		*/

		//this.atext.setAttribute( "width", this.position.width );

		// https://github.com/aframevr/aframe/blob/60a440cc5070a0ce95d5e4efcf2c3b5e108cbd25/src/components/text.js
		// https://github.com/Jam3/three-bmfont-text 
		// https://github.com/Jam3/layout-bmfont-text 
		// https://www.npmjs.com/package/word-wrapper
		
			/*
			console.warn("current wrapPixels was : ", this.atext.getAttribute("wrapPixels") );
			//this.atext.setAttribute("wrapPixels", widthInPixels);
			this.atext.setAttribute("wrap-pixels", widthInPixels);
			console.warn("Set wrappixels to ", widthInPixels, this.position.width);
			*/
	};

	_SetupClipping(){
        
        if( !this.DOM2AFrame.settings.clippingEnabled )
			return;

        let clippingContext = this._GetClippingContext();

        if( clippingContext ){

            this.clippingContext = clippingContext;

            // we are sure the renderer is loaded (DOM2AFrame only calls Update() after the element has a THREE.js equivalent loaded)
            let obj3d = this.atext.object3D;
            if( !obj3d || !obj3d.children || !obj3d.children.length > 0 || !obj3d.children[0].material ){
                console.error("TextElement._SetupClipping: Trying to set clipping but no Three.js element known!", obj3d, this);
                return;
            }

            let material = obj3d.children[0].material; // in a-frame, all object3D's are a Group, even if they just have 1 child.

			// the Text shader is a custom shader. This means THREE.js doesn't automatically inject the clippingPlanes into the text shader and we need to do it ourselves
			// so we copied the text shader code from the Text plugin and added the necessary stuff ourselves
			// https://stackoverflow.com/questions/42532545/add-clipping-to-three-shadermaterial
            // https://jsfiddle.net/27LrLsv5/1/
            let customFragment = `
            #ifdef GL_OES_standard_derivatives
			#extension GL_OES_standard_derivatives: enable
			#endif

            precision highp int;
			precision highp float;

            // these are set by WebGLProgram when material.isRawShaderMaterial is false (but we ARE raw shader, so we need to set these ourselves)
            // https://github.com/mrdoob/three.js/blob/30c966b579234717a3b237229ddedb62e2e6d986/src/renderers/webgl/WebGLProgram.js
            #define NUM_CLIPPING_PLANES 4
            #define UNION_CLIPPING_PLANES 4

            // https://github.com/mrdoob/three.js/blob/e220a4baac6b415124cbfbf370f3c7aa44fbb13e/src/renderers/shaders/ShaderChunk/clipping_planes_pars_fragment.glsl
			  #include <clipping_planes_pars_fragment>

			#define BIG_ENOUGH 0.001
			#define MODIFIED_ALPHATEST (0.02 * isBigEnough / BIG_ENOUGH)
			#define ALL_SMOOTH 0.4
			#define ALL_ROUGH 0.02
			#define DISCARD_ALPHA (alphaTest / (2.2 - 1.2 * ratio))
			uniform sampler2D map;
			uniform vec3 color;
			uniform float opacity;
			uniform float alphaTest;
			varying vec2 vUV;
			float median(float r, float g, float b) {
			  return max(min(r, g), min(max(r, g), b));
			}
			
			
			void main() {
              // https://github.com/mrdoob/three.js/blob/e220a4baac6b415124cbfbf370f3c7aa44fbb13e/src/renderers/shaders/ShaderChunk/clipping_planes_fragment.glsl
			  #include <clipping_planes_fragment>

			  vec3 sample = 1.0 - texture2D(map, vUV).rgb;
			  float sigDist = median(sample.r, sample.g, sample.b) - 0.5;
			  float alpha = clamp(sigDist/fwidth(sigDist) + 0.5, 0.0, 1.0);
			  float dscale = 0.353505;
			  vec2 duv = dscale * (dFdx(vUV) + dFdy(vUV));
			  float isBigEnough = max(abs(duv.x), abs(duv.y));
			  if (isBigEnough > BIG_ENOUGH) {
				float ratio = BIG_ENOUGH / isBigEnough;
				alpha = ratio * alpha + (1.0 - ratio) * (sigDist + 0.5);
			  }
			  if (isBigEnough <= BIG_ENOUGH && alpha < alphaTest) { discard; return; }
			  if (alpha < alphaTest * MODIFIED_ALPHATEST) { discard; return; }
			  gl_FragColor = vec4(color.xyz, alpha * opacity);
			}`;
            // 
            // 

            let customVertex = `
            
            #define NUM_CLIPPING_PLANES 4
            #define UNION_CLIPPING_PLANES 4

            #include <clipping_planes_pars_vertex>

            attribute vec2 uv;
			attribute vec3 position;
			uniform mat4 projectionMatrix;
			uniform mat4 modelViewMatrix;
			varying vec2 vUV;
			void main(void) {
        	    #include <begin_vertex>

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                vUV = uv;
                
                #include <project_vertex>
                #include <clipping_planes_vertex>
			}`;

            material.fragmentShader = customFragment;
            material.vertexShader = customVertex;

            // we need to set the clipping planes on all elements in the clipped subtree, since each element does its own clipping in their shader
            // however, the clippingContext is a reference value, so if we update these clipping plane definitions once (in the parent's Update), it will cascade to all these children as well
            material.clipping = true;
            material.clippingPlanes = clippingContext.planes;

            //console.error("Added clipping to TEXT ELEMENT ", this.domelement, this.clippingContext.authority.domelement );

            this.UpdateClipping(); // position the planes correctly for initialization
            material.needsUpdate = true;
        }
	}
	
	/*
    UpdateClipping(){

		// NOTE: we currently assume text elements themselves never have overflow set: always wrap them in a container that does!
		if( !this.clippingContext )
			return;

		if( !this.clippingShaderSetup ){
			console.error("TODO: setup clipping shader for text element!");
			this.clippingShaderSetup = true;
		}

		super.UpdateClipping();
	}
	*/
}