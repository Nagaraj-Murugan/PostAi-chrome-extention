document.addEventListener("DOMContentLoaded", function () {
  var baseUrl =
    "https://8b10-2405-201-e005-5a64-d8a4-b59b-4450-da2e.ngrok-free.app";

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

  var transactionId;
  var intervalId;

  getSummaryButton.addEventListener("click", function () {
    getSummaryButton.disabled = true;

    var moodRadioButtons = document.getElementsByName("mood");
    var selectedMood = Array.from(moodRadioButtons).find(
      (radio) => radio.checked
    );

    if (!selectedMood) {
      alert("Please select a mood before clicking Get Summary.");
      getSummaryButton.disabled = false;
      return;
    }

    var moodText = selectedMood.value;

    loadingSpinner.style.display = "block";
    errorMessage.style.display = "none";

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var currentTab = tabs[0];
      var url = currentTab.url;

      fetch(`${baseUrl}/v2/generate_summary`, {
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
          intervalId = setInterval(callSecondApi, 20000);
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
    fetch(`${baseUrl}/v2/inquire_summary/${transactionId}`, {
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
          }
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
      <input type="file" id="filesInput" multiple accept=".png, .jpg, .jpeg, .svg, .webp" />
    </div>
  `;

    var imageList = document.getElementById("imageList");
    data.images.forEach((imageUrl) => {
      var imgElement = document.createElement("img");
      imgElement.src = imageUrl;
      imgElement.classList.add("preview-image");
      imageList.appendChild(imgElement);
    });
  }

  function showGenerateVideoButton() {
    generateVideoButtonContainer.style.display = "block";
  }

  generateVideoButton.addEventListener("click", function () {
    console.log("Generate Video button clicked!");

    var title = document.getElementById("titleDisplay").innerText;
    var summary = document.getElementById("summaryDisplay").innerText;
    var images = document.querySelectorAll(".preview-image");
    var files = document.getElementById("filesInput").files;

    var selectedMood = document.querySelector('input[name="mood"]:checked');
    var formData = new FormData();
    formData.append("mood", selectedMood.value);
    formData.append("title", title);
    formData.append("summary", summary);

    images.forEach((img, index) => {
      formData.append(`image${index + 1}`, img.src);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var currentTab = tabs[0];
      var url = currentTab.url;
      formData.append("url", url);

      for (var i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      fetch(`${baseUrl}/v2/generate_video`, {
        method: "POST",
        body: formData,
        headers: {
          // Note: No need to set Content-Type for FormData
        },
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

  function handleMoodLabelClick(event) {
    document.querySelectorAll(".mood-label").forEach(function (label) {
      label.classList.remove("selected");
    });

    event.currentTarget.classList.add("selected");
  }

  document.querySelectorAll(".mood-label").forEach(function (label) {
    label.addEventListener("click", handleMoodLabelClick);
  });
});
