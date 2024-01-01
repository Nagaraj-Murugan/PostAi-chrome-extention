document.addEventListener("DOMContentLoaded", function () {
  var baseUrl =
    "https://c9b2-2405-201-e005-5a64-8151-bc75-578d-e4a0.ngrok-free.app/";

  var getSummaryButton = document.getElementById("getSummaryButton");
  var summaryResult = document.getElementById("summaryResult");
  var loadingSpinner = document.getElementById("loadingSpinner");
  var errorMessage = document.getElementById("errorMessage");
  var generateVideoButtonContainer = document.getElementById(
    "generateVideoButtonContainer"
  );
  var generateVideoButton = document.getElementById("generateVideoButton");
  var videoProgressBar = document.getElementById("videoProgressBar");
  var uploadedImagesContainer = document.getElementById(
    "uploadedImagesContainer"
  );
  var filesInput = document.getElementById("filesInput");
  var selectedMood;

  getSummaryButton.addEventListener("click", function () {
    getSummaryButton.disabled = true;

    var moodRadioButtons = document.getElementsByName("mood");
    selectedMood = Array.from(moodRadioButtons).find((radio) => radio.checked);

    if (!selectedMood) {
      alert("Please select a mood before clicking Get Summary.");
      getSummaryButton.disabled = false;
      return;
    }

    // Remove the 'selected' class from all mood labels
    document.querySelectorAll(".mood-label").forEach((label) => {
      label.classList.remove("selected");
    });

    // Add the 'selected' class to the selected mood label
    selectedMood.closest(".mood-label").classList.add("selected");

    var moodText = selectedMood.value;

    loadingSpinner.style.display = "block";
    errorMessage.style.display = "none";

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var currentTab = tabs[0];
      var url = currentTab.url;

      fetch(`${baseUrl}v2/generate_summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          mood: moodText,
          is_test: document.getElementById("isTest").value,
          is_blog: false,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Network response was not ok: ${response.status} - ${response.statusText}`
            );
          }
          return response.json();
        })
        .then((data) => {
          console.log(data);
          loadingSpinner.style.display = "none";
          transactionId = data.transaction_id;
          summaryResult.innerHTML = `
            <div class="summary-container preview-container">
              <p><strong>Transaction ID:</strong> <span class="small">${transactionId}</span></p>
              <p id="titleDisplay"><strong>Title:</strong> <span class="loading-spinner"></span></p>
              <p id="summaryDisplay" style="display: none;"><strong>Summary:</strong> <span class="loading-spinner"></span></p>
            </div>
          `;
          intervalId = setInterval(callSecondApi, 10000);
          getSummaryButton.disabled = false;
        })
        .catch((error) => {
          console.error("Error:", error);
          loadingSpinner.style.display = "none";
          errorMessage.style.display = "block";
          errorMessage.innerHTML = "Error fetching data from the API";
          getSummaryButton.disabled = false;
        });
    });
  });

  function callSecondApi() {
    fetch(`${baseUrl}v2/inquire_summary/${transactionId}`, {
      method: "GET",
      timeout: 10000,
      headers: {
        "ngrok-skip-browser-warning": "1",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Network response was not ok: ${response.status} - ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        console.log(data);

        if (data.status === "pending") {
          displayLoadingSpinner();
        } else {
          if (data.title) {
            clearInterval(intervalId);
            loadingSpinner.style.display = "none";
            displaySummary(data);
            showGenerateVideoButton();
            showChooseFileButton();
            selectedImageUrls = data.images; // Updated to use images from the response
          }
        }

        function showChooseFileButton() {
          var chooseFileLabel = document.getElementById("chooseFileLabel");
          chooseFileLabel.style.display = "block";
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        loadingSpinner.style.display = "none";
        errorMessage.style.display = "block";
        errorMessage.innerHTML = "Error fetching data from the API";
      });
  }

  function displayLoadingSpinner() {
    var titleDisplay = document.getElementById("titleDisplay");
    titleDisplay.innerHTML = `<strong>Title:</strong> <span class="loading-spinner"></span>`;
  }

  function displaySummary(data) {
    summaryResult.innerHTML = `
    <div class="summary-container preview-container">
      <p><strong>Transaction ID:</strong> <span class="small">${transactionId}</span></p>
      <p id="titleDisplay"><strong>Title:</strong> ${data.title}</p>
      <p id="summaryDisplay"><strong>Summary:</strong> ${data.summary}</p>
      <p><strong>Status:</strong> ${data.status}</p>
      <p><strong>Images:</strong></p>
      <ul id="imageList" style="background-color: black;"></ul>
    </div>
  `;

    var imageList = document.getElementById("imageList");
    data.images.forEach((imageUrl) => {
      var listItem = document.createElement("li");

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = imageUrl;
      checkbox.classList.add("image-checkbox");

      var imgElement = document.createElement("img");
      imgElement.src = imageUrl;
      imgElement.classList.add("preview-image");

      listItem.appendChild(checkbox);
      listItem.appendChild(imgElement);
      imageList.appendChild(listItem);
    });
  }

  function showGenerateVideoButton() {
    generateVideoButtonContainer.style.display = "block";
  }

  generateVideoButton.addEventListener("click", function () {
    console.log("Generate Video button clicked!");

    var title = document.getElementById("titleDisplay").innerText;
    var summary = document.getElementById("summaryDisplay").innerText;
    var files = document.getElementById("filesInput").files;
    var selectedImageCheckboxes = document.querySelectorAll(
      ".image-checkbox:checked"
    );
    var selectedImageUrls = Array.from(selectedImageCheckboxes).map(
      (checkbox) => checkbox.value
    );

    var formData = new FormData(); // Corrected: Move the creation here
    formData.append("mood", selectedMood.value);
    formData.append("title", title);
    formData.append("summary", summary);
    formData.append("image_list", selectedImageUrls.join(",")); // Use selectedImageUrls directly

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var currentTab = tabs[0];
      var url = currentTab.url;
      formData.append("url", url);

      for (var i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      fetch(`${baseUrl}v2/generate_video`, {
        method: "POST",
        body: formData,
        headers: {},
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Network response was not ok: ${response.status} - ${response.statusText}`
            );
          }
          return response.blob();
        })
        .then((blob) => {
          var url = window.URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = "generated_video.mp4";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          alert("Video file received successfully!");
        })
        .catch((error) => {
          console.error("Error during generate_video request:", error);
          alert("Error generating video. Please try again.");
        })
        .finally(() => {
          videoProgressBar.style.display = "none";
          generateVideoButton.disabled = false;
        });
    });
  });

  function handleImageClick(event) {
    if (selectImageCheckbox.checked) {
      var clickedImage = event.target;

      if (clickedImage.tagName === "IMG") {
        var imageUrl = clickedImage.src;

        if (clickedImage.classList.contains("selected-image")) {
          // Image was selected, remove from the array and the selected-image class
          selectedImageUrls = selectedImageUrls.filter(
            (url) => url !== imageUrl
          );
          clickedImage.classList.remove("selected-image");
        } else {
          // Image was not selected, add to the array and add the selected-image class
          selectedImageUrls.push(imageUrl);
          clickedImage.classList.add("selected-image");
        }

        generateVideoButton.disabled = selectedImageUrls.length === 0;
        console.log("Selected Image URLs:", selectedImageUrls);
      }
    }
  }

  document
    .getElementById("imageList")
    .addEventListener("click", handleImageClick);

  uploadedImagesContainer.addEventListener("click", function (event) {
    if (selectImageCheckbox.checked) {
      var clickedImage = event.target;

      if (clickedImage.tagName === "IMG") {
        var imageUrl = clickedImage.src;

        if (clickedImage.classList.contains("selected-image")) {
          // Image was selected, remove from the array and the selected-image class
          selectedImageUrls = selectedImageUrls.filter(
            (url) => url !== imageUrl
          );
          clickedImage.classList.remove("selected-image");
        } else {
          // Image was not selected, add to the array and add the selected-image class
          selectedImageUrls.push(imageUrl);
          clickedImage.classList.add("selected-image");
        }

        generateVideoButton.disabled = selectedImageUrls.length === 0;
        console.log("Selected Image URLs:", selectedImageUrls);
      }
    }
  });

  filesInput.addEventListener("change", function () {
    var files = filesInput.files;

    uploadedImagesContainer.innerHTML = "";
    selectedImageUrls = []; // Reset selectedImageUrls

    for (var i = 0; files && i < files.length; i++) {
      // Check for file format before proceeding
      var allowedFormats = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"];
      var fileName = files[i].name.toLowerCase();
      var fileExtension = fileName.slice(
        ((fileName.lastIndexOf(".") - 1) >>> 0) + 2
      );

      if (!allowedFormats.includes("." + fileExtension)) {
        alert("Invalid file format. Please select a valid image file.");
        filesInput.value = null; // Clear the input field
        generateVideoButton.disabled = true; // Disable generate video button
        return;
      }

      // Limit to selecting only two files
      if (i >= 2) {
        alert("You can select only two files.");
        filesInput.value = null; // Clear the input field
        generateVideoButton.disabled = true; // Disable generate video button
        return;
      }

      var file = files[i];

      var reader = new FileReader();

      reader.onload = function (e) {
        var imgElement = document.createElement("img");
        imgElement.src = e.target.result;
        imgElement.classList.add("uploaded-image");
        uploadedImagesContainer.appendChild(imgElement);
      };
      reader.readAsDataURL(file);
    }

    // Enable generate video button only if files are selected
    generateVideoButton.disabled = files.length === 0;
  });

  selectImageCheckbox.addEventListener("change", function () {
    if (this.checked) {
      selectImageContainer.style.display = "block";
    } else {
      selectImageContainer.style.display = "none";
    }
  });

  selectImageAllButton.addEventListener("click", function () {
    document.querySelectorAll(".uploaded-image").forEach(function (img) {
      img.classList.add("selected-image");
      var imageUrl = img.src;
      if (!selectedImageUrls.includes(imageUrl)) {
        selectedImageUrls.push(imageUrl);
      }
    });

    generateVideoButton.disabled = selectedImageUrls.length === 0;
  });

  selectImageNoneButton.addEventListener("click", function () {
    document.querySelectorAll(".uploaded-image").forEach(function (img) {
      img.classList.remove("selected-image");
      var imageUrl = img.src;
      selectedImageUrls = selectedImageUrls.filter((url) => url !== imageUrl);
    });

    generateVideoButton.disabled = true;
  });
});
