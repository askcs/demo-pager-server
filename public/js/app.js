/**
 * Created by sstam on 30-10-13.
 */
$(document).ready(function(){
    $( "#sendalarm" ).click(function() {
        var message = $("#message").val();
        message = message.replace("\n", "");
        if(message!="") {
            $.get("/alarm/all?message="+encodeURIComponent(message), function(result){
                $(".alert").text(result);
                $(".alert").show();

                setTimeout(function(){
                    $(".alert").hide();
                }, 5000);
            });
        }
    });

    $( "#sendtext" ).click(function() {
        var message = $("#message").val();
        message = message.replace("\n", "");
        if(message!="") {
            $.get("/message/all?message="+encodeURIComponent(message), function(result){
                $(".alert").text(result);
                $(".alert").show();

                setTimeout(function(){
                    $(".alert").hide();
                }, 5000);
            });
        }
    });

    $(".alert").hide();

    $.get('/clients', function(result){
       console.log(result);
    });
});