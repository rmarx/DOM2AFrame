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