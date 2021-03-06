$(document).ready(function() {

  // OAuth Token. (This should probably be encrypted but it's OK for now)
  var auth = "FGSMQANMR2CUSP7RFDDL";
  // URL to get a list of all events Eventbrite has. (For debug purposes. Not currently in use.)
  var allEventURL = "https://www.eventbriteapi.com/v3/events/search/?token=" + auth;
  // URL to get a list of all categories Eventbrite has.
  var catURL = "https://www.eventbriteapi.com/v3/categories/?token=" + auth;
  // URL to get a list of all subcategories Eventbrite has. (For debug purposes. Not currently in use.)
  var subcatURL = "https://www.eventbriteapi.com/v3/subcategories/?token=" + auth;
  // The URL to be queried. Modified as necessary.
  var queryURL = "";
  // Used in generating results page buttons
  var initialQuery = true;
  // Used in deciding which buttons to show at a given time.
  var currentPage = 1;
  // Used to determine whether to display all buttons or not.
  var lotsOfButtons = false;

  // Get list of Eventbrite categories and append them to #event-type dropdown
  $.ajax({
    url: catURL,
    method: "GET"
  }).then(function(response) {
    for (var i = 0; i < response.categories.length; i++) {
      var newOption = $(
        "<option id='" +
          response.categories[i].short_name +
          "' value='" +
          response.categories[i].id +
          "'>" +
          response.categories[i].short_name +
          "</option>"
      );
      $("#event-type").append(newOption); 
    }
  });

  /*
  // Get list of Eventbrite subcategories (Not currently in use. Might implement somehow later.)
  $.ajax({
    url: subcatURL,
    method: "GET"
  })
  .then(function(response) {
    console.log("Subcategories: ");
    console.log(response);
  });
  */

  $("#submit").click(function() {
    $("#submit").attr("disabled", "disabled");
    initialQuery = true;
    $("#results-buttons-up").empty();
    $("#results-buttons-down").empty();

    // to hide the html elements on the landing page on click to show the results.Yin
    $('#centerpiece').hide();
    $('#pop-searches').hide();
    $('#one').hide();

    var selectedStartDate = $("#start-event").val();
    var selectedEndDate = $("#end-event").val();
    
    if(selectedStartDate <= selectedEndDate) {
      var selectedCat = $('#event-type').val();
      var radius = $("#event-location-radius").val(); 

    // creating a temp obj to hold values. Yin
    var newObj = {
        category: selectedCat,
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        radius: radius
    };

    // push values from the temp newobj to fb
    database.ref().push(newObj);
      console.log(newObj);
      console.log(newObj.startDate);
      console.log(newObj.endDate);
    
    // clearing the input boxes.
    $("#start-event").val("");
    $("#end-event").val("");

      var latitude = coordinates.lat; // Taken from placesAPI.js
      var longitude = coordinates.lng; // Taken from placesAPI.js
      if(latitude === undefined || longitude === undefined || selectedCat === undefined) {
        return;
      }
      var categoryPiece = "";
      var startDatePiece = "";
      var endDatePiece = "";
      if(parseInt(selectedCat) !== -1) {
        categoryPiece = "&categories=" + selectedCat;
      }
      if(selectedStartDate !== "") {
        startDatePiece = "&start_date.range_start=" + selectedStartDate + "T00:00:01Z";
      }
      if(selectedEndDate !== "") {
        endDatePiece = "&start_date.range_end=" + selectedEndDate + "T00:00:01Z";
      }

      queryURL = "https://cors-anywhere.herokuapp.com/https://www.eventbriteapi.com/v3/events/search/?location.longitude=" + longitude + "&location.latitude=" + 
        latitude + "&location.within=" + radius + "mi" + categoryPiece + startDatePiece + endDatePiece + "&expand=venue,ticket_availability,format" 
        + "&token=" + auth;

      getEvents(queryURL);
    } 
    // The user entered a start date that's later than the end. Display an error message. 
    else {
      console.log("Invalid date entry");
      alert("Start date later than end date error. Take this alert out later.");
    }

    return false;
  });

  function getEvents(URL) {
    // Gets a list of events.
    $.ajax({
      url: URL,
      method: "GET"
    }).then(function(response) {
      console.log("Events: !!");
      console.log(response);

      $("#results-page").empty();
      if(initialQuery) {
        initialQuery = false;
        currentPage = 1;

        // Make results buttons if this is the first search with these terms.
        for(var i = 1; i < response.pagination.page_count; i++) {
          var newButtonUp = $("<button value='" + i + "' class='btn btn-dark' id='btn-up-" + i +"'>" + i + "</button>");
          var newButtonDown = $("<button value='" + i + "' class='btn btn-dark' id='btn-down-" + i + "'>" + i + "</button>");  
          newButtonDown.css("margin-right", "2px");
          newButtonUp.css("margin-right", "2px");       
          $("#results-buttons-up").append(newButtonUp);
          $("#results-buttons-down").append(newButtonDown);
          $("#btn-up-" + i).click(function() {
            disableButtons(response.pagination.page_count);
            getEvents(queryURL +  "&page=" + $(this).attr("value"));
            shiftButtons($(this).attr("value"), response.pagination.page_count);
          });
          $("#btn-down-" + i).click(function() {
            disableButtons(response.pagination.page_count);                        
            getEvents(queryURL +  "&page=" + $(this).attr("value"));
            shiftButtons($(this).attr("value"), response.pagination.page_count);
          });
        }
        shiftButtons(1, response.pagination.page_count);
      }
      for(var i = 0; i < response.events.length; i++) {
        var newShell = $("<div id='" + i + "-outer' class='result-shell' data-name='" + response.events[i].name.text + 
          "' data-longitude='" + response.events[i].venue.longitude + "' data-latitude='" + response.events[i].venue.latitude + 
          "' data-start='" + response.events[i].start.local + "' data-address='" + response.events[i].venue.address.localized_address_display + 
          "'>" + response.events[i].name.text + "</div>");
        var newInside = $("<div id='" + i + "-inner' class='result-interior collapse'>" + "This is an inner result" + "</div>");
        var linebreak = $("<br>");
        newInside.css("display", "none");
        newShell.click(function() {
          console.log("Clicked a result");
          console.log($(this));
          if(newInside.css("display") === "none") {
            newInside.css("display", "block");
          } else {
            newInside.css("display", "none");
          }
        }) ;
        $("#results-page").append(newShell);
        newShell.append(newInside);
        $("#results-page").append(linebreak);
        enableButtons(response.pagination.page_count);
      }

      // Recursive query for displaying all items on one page together.
      /*
      if(response.pagination.has_more_items) {
        var nextPage = response.pagination.page_number + 1
        getEvents(queryURL +  "&page=" + nextPage);
      }
      */
    });

    function shiftButtons(curButton, totalButtons) {
      var cur = parseInt(curButton);
      var tot = parseInt(totalButtons);
      for(var j = 0; j < tot; j++) {
        $("#btn-up-" + j).css("display", "none");
        $("#btn-down-" + j).css("display", "none");
      }
      for(var i = (cur - 6); i < (cur + 7); i++) {
        $("#btn-up-" + i).css("display", "inline");
        $("#btn-down-" + i).css("display", "inline");
      }
      $("#btn-up-" + currentPage).css("background-color", "black");
      $("#btn-down-" + currentPage).css("background-color", "black");
      $("#btn-up-" + cur).css("background-color", "darkseagreen");
      $("#btn-down-" + cur).css("background-color", "darkseagreen");
      $("#btn-up-" + (tot - 1)).css("display", "inline");
      $("#btn-down-" + (tot - 1)).css("display", "inline");
      $("#btn-up-" + 1).css("display", "inline");
      $("#btn-down-" + 1).css("display", "inline");
      currentPage = cur;
    }
  }

  function disableButtons(totalButtons) {
    for(var i = 0; i < totalButtons; i++) {
      $('#btn-up-' + i).attr('disabled','disabled');
      $('#btn-down-' + i).attr('disabled','disabled');
      $("#submit").attr("disabled", "disabled");
    }
  }

  function enableButtons(totalButtons) {
    for(var i = 0; i < totalButtons; i++) {
      $('#btn-up-' + i).removeAttr('disabled');
      $('#btn-down-' + i).removeAttr('disabled');
      $("#submit").removeAttr("disabled");
    }
  }

  // ---------------------------------------------------FIREBASE------------------------------------------------
 
  var database = firebase.database();

  // CREATING A FIREBASE EVENT.
  database.ref().on("child_added", function(snapshot) {
    //console.log(snapshot.val());
    //console.log('hi');

    var selectedCat = snapshot.val().category;
    var selectedStartDate = snapshot.val().startDate;
    var selectedEndDate = snapshot.val().endDate;

   //console.log(selectedCat);
    //console.log(selectedStartDate);
    //console.log(selectedEndDate + 'end');
    // appending to dom
    var newRow = $('<tr>').append(
    $('<td>').text(selectedCat),
    $('<td>').text(selectedStartDate),
    $('<td>').text(selectedEndDate)
    );

    $('#results-table > tbody').append(newRow);
  });
});
