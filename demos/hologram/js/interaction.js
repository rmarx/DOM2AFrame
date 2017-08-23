$(document).ready(function() {

    $("#hologramToggleButton").click(function(e) {
        $("#hologramCanvas").toggle();
    });
    
    $("#hologramAnimationInput_Idle").click(function(e) {

        $(e.currentTarget).parent().children("input").each( (index, child) => { child.d2aelement.Update(true, true); }); // there is no OnChange event that we can listen to, sadly

        for( let hologram of holograms){
            hologram.FadeAction(hologram.arrAnimations[0]);
        }
    });
    
    $("#hologramAnimationInput_Walk").click(function(e) {

        $(e.currentTarget).parent().children("input").each( (index, child) => { child.d2aelement.Update(true, true); }); // there is no OnChange event that we can listen to, sadly

        for( let hologram of holograms){
            hologram.FadeAction(hologram.arrAnimations[1]);
        }
    });
    
    $("#hologramAnimationInput_Run").click(function(e) {

        $(e.currentTarget).parent().children("input").each( (index, child) => { child.d2aelement.Update(true, true); }); // there is no OnChange event that we can listen to, sadly

        for( let hologram of holograms){
            hologram.FadeAction(hologram.arrAnimations[2]);
        }
    });
    
    $("#hologramAnimationInput_Hello").click(function(e) {

        $(e.currentTarget).parent().children("input").each( (index, child) => { child.d2aelement.Update(true, true); }); // there is no OnChange event that we can listen to, sadly

        for( let hologram of holograms){
            hologram.FadeAction(hologram.arrAnimations[3]);
        }
    });
    
    $("#hologramAnimationInput_Rotate").click(function(e) {
        
        e.currentTarget.d2aelement.Update(true, true); // there is no "OnChange" event that we can listen to, sadly
        
        for( let hologram of holograms){
            hologram.rotating = !hologram.rotating;
        }
    });


    $("#videoTypeToggleButton").click(function(e) {
        alert("TODO!");
    });

    $("#videoPlayButton").click(function(e) {
        let video = document.getElementById("video");
        if( video.paused )
            video.play();
        else
            video.pause();
    });
    
    $("#consoleSendButton").click(function(e) {
        let CLI = document.getElementById("cliOutputContainer");
        
        let html = "<p>" + $("#consoleInput").val() + "</p>";
        CLI.insertAdjacentHTML('beforeend', html);

        $("#consoleInput").val(""); // clear input for next command
        $("#consoleInput").get(0).d2aelement.Update(true,true); // .trigger("input") and .trigger("change") don't work. FIXME: dig deeper, this shouldn't be needed! 
    });

    $("#debugToggle").click(function(e) {
        e.currentTarget.d2aelement.Update(true, true); // there is no "OnChange" event that we can listen to, sadly
        window.MainDOM2AFrame.state.debugging = !window.MainDOM2AFrame.state.debugging;
    });

    const container = document.getElementById("container");
    if( container.aframeSceneLoaded )
        $("#debugToggle").attr("checked", (window.MainDOM2AFrame.state.debugging ? "checked" : false));
    else
        container.addEventListener("aframe-scene-loaded", (evt) => { 
            $("#debugToggle").attr("checked", (window.MainDOM2AFrame.state.debugging ? "checked" : false)); 
        });
});


document.addEventListener("keydown", onKeyDown);//.onkeydown = onKeyDown;

function onKeyDown(e) {

    e = e || window.event;

    console.log("Interaction:onKeyDown : pressed", e);
    if (e.keyCode == '65') {
        
    }
    else if (e.keyCode == '69') {

    }

}