class Logger{

    constructor(){
        this.enabled = true;
        this.updateLoopOutputContainer = document.getElementById("updateLoopLogOutput");
        this.ResetUpdateLoop();
    }

    ResetUpdateLoop(){
        this.updatedElements = new Array();
        if( this.updateLoopOutputContainer )
            this.updateLoopOutputContainer.innerHTML = "";
    }

    OnElementUpdated(d2aelement, wasDirty, wasForced){
        if( !this.enabled )
            return;
        
        console.log("OnElementUpdated",  Date.now(), d2aelement.domelement);
        this.updatedElements.push({d2aelement: d2aelement, wasDirty: wasDirty, wasForced: wasForced, timestamp: Date.now()});
        this.RenderUpdatedElements();
    }

    OnElementMutated(d2aelement, mutation){
        if( !this.enabled )
            return;
        
        console.trace("OnElementMutated",  Date.now(), d2aelement.domelement);
        this.updatedElements.push({d2aelement: d2aelement, mutation: (mutation || "FakeMutation"), timestamp: Date.now()});
        this.RenderUpdatedElements();
    }

    RenderUpdatedElements(){
        if( !this.enabled )
            return;
        
        if( this.updateLoopOutputContainer ){
            let output = "";
            for( let wrap of this.updatedElements ){

                let el = wrap.d2aelement;
                let wasDirty = wrap.wasDirty;
                let wasForced = wrap.wasForced;
                let mutation = wrap.mutation;

                let identifier = el.domelement.id;
                if( !identifier ){
                    identifier = ("" + el.domelement.innerHTML).substring(0, 50);
                }

                identifier += " // " + el.domelement.tagName + " " + el.constructor.name;

                let style = "";
                if( wasForced && wasDirty)
                    style = "padding: 5px; background-color: blue; color: white;";
                else if( wasDirty )
                    style = "padding: 5px; background-color: green; color: white;";
                else if( wasForced )
                    style = "padding: 5px; background-color: red; color: white;";
                else if( mutation )
                    style = "padding-left: 20px; background-color: lightgreen; color: black;";

                output += "<p style=\""+style+"\">"+ wrap.timestamp + " : " + identifier +" ("+ JSON.stringify(mutation) +")</p>";
            }
            this.updateLoopOutputContainer.innerHTML = output;
        }
    }


    
}
    
let Log = new Logger();
Log.enabled = false;