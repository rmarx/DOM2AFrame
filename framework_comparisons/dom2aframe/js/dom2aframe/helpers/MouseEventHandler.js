
/*
    Mission: we want to tie AFrame Mouse events to DOM events (e.g. click, mouseenter, etc.)
    Basic idea: we just listen for those events in AFrame-land and perform an equivalent domelement.dispatchEvent() on the appropriate domelement, DONE!
    The problem: event listening on ALL the AFrame elements and then also dispatching eacht event to all domelements... not so good for performance (click = ok, but mouseenter and mouseleave? auch)
    Refinement of the idea: only listen for mouse events in AFrame-land if they have a dom equivalent listener/handler registered!
    Now the problems really begin...

    - Problem 1: There is no way to get a list of all registered event listeners on a dom element, let alone for a specific type of event. 
    - Problem 2: On top of that, there are multiple ways to register listeners, mainly using addEventListener and things like .onclick, .onmouseenter etc. (note: setAttribute("onclick", fn) doesn't seem to work)
        -> the nice thing here though is that if we use dispatchEvent() to launch a "click" event for instance, both addEventListener('click') and .onclick will fire!

    - Solution 1: use eventListenerPlugin.js : this overrides the default add/removeEventListeners to keep an internal list of all registered event listeners. This also sends its own events eventHandlerAdded/Removed that we can listen to (see BaseElement.js)
    - Solution 2: manually check for these properties

    Now we still have the problem that we might miss handlers registered before our BaseElement and eventListenerPlugin are started and listening for changes.
    For this, we setup this MouseEventHandler class to be stateless: everytime something changes, we just re-check everything
    This is a little less ok in terms of performance, but much easier to reason about + this shouldn't happen that often anyway
*/

class MouseEventHandler{

    constructor(d2aelement){
        this.d2aelement = d2aelement;
    }

    HandleListenersAdded(evt){
        this._resync();
    }

    HandleListenersRemoved(evt){
        this._resync();
    }

    _resync(){
        let mouseEvents     = ["click",     "mouseenter",   "mouseleave",   "mousedown",    "mouseup"];
        let mouseProperties = ["onclick",   "onmouseenter", "onmouseleave", "onmousedown",  "onmouseup"];

        // TODO: make this more performant by keeping track of which event handlers are actually registered and only dispatching events for those! instead of just treating all mouse events as 1 bag
        let hasMouseEventRegistered = false;
        for( let mouseEvent of mouseEvents ){
            if( this.d2aelement.domelement.eventListenerList && this.d2aelement.domelement.eventListenerList[mouseEvent] ){
                hasMouseEventRegistered = true;
                break;
            }
        }

        let hasMouseProperty = false;
        for( let mouseProperty of mouseProperties ){
            if( this.d2aelement.domelement[mouseProperty] ){
                hasMouseProperty = true;
                break;
            }
        }

        let aelement = this.d2aelement.aelement;
        if( hasMouseEventRegistered || hasMouseProperty ){
            if( !aelement.d2alisteningForMouseEvents ){ // TODO: maybe use something nicer than an extra property on the element to keep track of this state?
            
                console.log("MouseEventHandler:_resync : adding mouse listeners: ", this.d2aelement.domelement, hasMouseEventRegistered, hasMouseProperty );

                this._addMouseListeners(aelement, mouseEvents);
                aelement.d2alisteningForMouseEvents = true;
            }
            // else: we're already listening... nothing to be done :)
        }
        else if( aelement.d2alisteningForMouseEvents ){ // neither event handlers nor event properties registered : can safely remove our listeners

            console.log("MouseEventHandler:_resync : removing mouse listeners: ", this.d2aelement.domelement, hasMouseEventRegistered, hasMouseProperty );

            this._removeMouseListeners(aelement, mouseEvents);
            aelement.d2alisteningForMouseEvents = false;
        }
    }

    _mouseEventHandler(evt){
        //console.log("MouseEventHandler:_mouseEventHandler : intercepted AFrame mouse event, propagating to domelement!", evt, this.d2aelement.domelement );

        var mouseEvent = new MouseEvent( evt.type, {
            'view': window,
            'bubbles': true,
            'cancelable': true,
            'target': this.d2aelement.domelement // TODO: not sure if this is needed? doesn't dispatchEvent do this itself?
        });

  		this.d2aelement.domelement.dispatchEvent( mouseEvent );
    };

    _addMouseListeners(aelement, mouseEventNames){
        mouseEventNames.map( (eventName) => {
            //console.log("Adding event handler ", eventName, aelement);
            aelement.addEventListener( eventName, this._mouseEventHandler.bind(this) );
        });
    }

    _removeMouseListeners(aelement, mouseEventNames){
        mouseEventNames.map( (eventName) => {
            //console.log("Removing event handler ", eventName, aelement);
            aelement.removeEventListener( eventName, this._mouseEventHandler.bind(this) );
        });
    }

};