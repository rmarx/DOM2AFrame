class PropertyCache{
    
    constructor(){
        this.properties = new Map();
        this.boundingRect = undefined;
        this.computedStyle = undefined;


        this.positionChanged = false; // position is a special case, not handled through normal CSS properties
        this.styleChanged = false;
    }
    
    Register( propertyName ){
        let val = {};
        val.oldValue = undefined;
        val.newValue = undefined;
        val.wasChanged = false;
        this.properties.set( propertyName, val);
    }

    GetValue( propertyName ){
        let property = this.properties.get( propertyName );
        if( !property )
            return undefined;

        return property.newValue;
    }

    SomethingChanged(){
        return this.styleChanged || this.positionChanged;
    }


    UpdateFromComputedStyle(computedStyle){
        this.styleChanged = false;

        for( let [propertyName, val] of this.properties ){
            let newValue = computedStyle.getPropertyValue( propertyName );

            // at this point, val.newValue is the "old" value from the previous update and val.oldValue is from 2 updates ago 
            if( val.newValue != newValue ){
                this.styleChanged = true; // TODO: maybe keep explicit list of changed properties? 
                
                val.oldValue = val.newValue;
                val.newValue = newValue;
                val.wasChanged = true;
            }
        }

        this.computedStyle = computedStyle;
    }

    UpdateFromBoundingRect(boundingRect, position){

        if( !position.EqualsDOMPosition(boundingRect) )
            this.positionChanged = true;
        else
            this.positionChanged = false;

        position.UpdateFromDOMPosition(boundingRect);
        this.boundingRect = boundingRect;
    }
}