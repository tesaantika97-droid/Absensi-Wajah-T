document.addEventListener("DOMContentLoaded", () => {
  // ==========================================================================
  // DOM ELEMENTS
  // ==========================================================================
  const studentNameInput = document.getElementById("studentName");
  const btnToggleCamera = document.getElementById("btnToggleCamera");
  const btnCapturePhoto = document.getElementById("btnCapturePhoto");
  const btnSubmitAttendance = document.getElementById("btnSubmitAttendance");
  const webcamVideo = document.getElementById("webcamVideo");
  const photoCanvas = document.getElementById("photoCanvas");
  const capturedPreviewOverlay = document.getElementById("capturedPreviewOverlay");
  const capturedImage = document.getElementById("capturedImage");
  const cameraLoading = document.getElementById("cameraLoading");
  const cameraOffOverlay = document.getElementById("cameraOffOverlay");
  const shutterFlash = document.getElementById("shutterFlash");
  
  // History Elements
  const historyTableBody = document.getElementById("historyTableBody");
  const historyEmptyState = document.getElementById("historyEmptyState");
  const historyCountLabel = document.getElementById("historyCount");
  
  // Settings Modal Elements
  const settingsModal = document.getElementById("settingsModal");
  const btnOpenSettings = document.getElementById("btnOpenSettings");
  const btnCloseSettings = document.getElementById("btnCloseSettings");
  const btnCancelSettings = document.getElementById("btnCancelSettings");
  const btnSaveSettings = document.getElementById("btnSaveSettings");
  const gasUrlInput = document.getElementById("gasUrlInput");
  
  // Toast Container
  const toastContainer = document.getElementById("toastContainer");

  // ==========================================================================
  // STATE VARIABLES
  // ==========================================================================
  let localStream = null;
  let isCameraActive = false;
  let capturedBase64 = null; // Full base64 for submission
  let thumbnailBase64 = null; // Lightweight thumbnail for localStorage

  // Constants
  const STORAGE_HISTORY_KEY = "absensi_wajah_history";
  const STORAGE_URL_KEY = "absensi_wajah_gas_url";

  // Load configuration from local storage
  let gasUrl = localStorage.getItem(STORAGE_URL_KEY) || "";
  gasUrlInput.value = gasUrl;

  // Render initial history
  renderHistory();

  // ==========================================================================
  // CAMERA OPERATIONS
  // ==========================================================================
  async function startCamera() {
    cameraLoading.classList.remove("hidden");
    cameraOffOverlay.classList.add("hidden");
    
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      };
      
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      webcamVideo.srcObject = localStream;
      webcamVideo.classList.add("active");
      isCameraActive = true;
      
      // Update UI state
      btnToggleCamera.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.73-2.91a4 4 0 1 1-5.66-5.66"/>
        </svg>
        <span>Matikan Kamera</span>
      `;
      btnToggleCamera.classList.replace("btn-secondary", "btn-primary");
      btnCapturePhoto.disabled = false;
      
      // Clear previous captured photo when restarting camera
      clearCapture();
      
    } catch (error) {
      console.error("Camera access error:", error);
      showToast("Kamera Gagal", "Tidak dapat mengakses webcam. Pastikan izin kamera telah diberikan.", "error");
      cameraOffOverlay.classList.remove("hidden");
    } finally {
      cameraLoading.classList.add("hidden");
    }
  }

  function stopCamera() {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    
    webcamVideo.srcObject = null;
    webcamVideo.classList.remove("active");
    isCameraActive = false;
    
    // Update UI state
    btnToggleCamera.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      <span>Aktifkan Kamera</span>
    `;
    btnToggleCamera.classList.replace("btn-primary", "btn-secondary");
    btnCapturePhoto.disabled = true;
    cameraOffOverlay.classList.remove("hidden");
    
    clearCapture();
  }

  btnToggleCamera.addEventListener("click", () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  });

  // ==========================================================================
  // CAPTURING PHOTO
  // ==========================================================================
  btnCapturePhoto.addEventListener("click", () => {
    if (!isCameraActive || !localStream) return;

    // 1. Shutter Flash Animation
    shutterFlash.classList.add("flash-active");
    setTimeout(() => {
      shutterFlash.classList.remove("flash-active");
    }, 400);

    // 2. Grab frame to canvas
    const videoWidth = webcamVideo.videoWidth || 640;
    const videoHeight = webcamVideo.videoHeight || 480;
    photoCanvas.width = videoWidth;
    photoCanvas.height = videoHeight;
    
    const context = photoCanvas.getContext("2d");
    
    // Mirror the image horizontally to match webcam display
    context.translate(videoWidth, 0);
    context.scale(-1, 1);
    context.drawImage(webcamVideo, 0, 0, videoWidth, videoHeight);
    
    // Extract full base64 quality JPEG
    capturedBase64 = photoCanvas.toDataURL("image/jpeg", 0.85);

    // 3. Create a lightweight thumbnail (e.g. max 80px width) for local history
    const thumbWidth = 80;
    const thumbHeight = (videoHeight / videoWidth) * thumbWidth;
    
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = thumbWidth;
    thumbCanvas.height = thumbHeight;
    const thumbContext = thumbCanvas.getContext("2d");
    
    // Draw the main canvas content into the smaller thumbnail canvas
    thumbContext.drawImage(photoCanvas, 0, 0, thumbWidth, thumbHeight);
    thumbnailBase64 = thumbCanvas.toDataURL("image/jpeg", 0.7);

    // 4. Update Preview Overlay
    capturedImage.src = capturedBase64;
    capturedPreviewOverlay.classList.remove("hidden");
    
    // Enable "Ambil Foto" to act as a recapture button, keeping state active
    btnCapturePhoto.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
      </svg>
      <span>Foto Ulang</span>
    `;

    validateForm();
  });

  function clearCapture() {
    capturedBase64 = null;
    thumbnailBase64 = null;
    capturedImage.src = "";
    capturedPreviewOverlay.classList.add("hidden");
    
    btnCapturePhoto.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <span>Ambil Foto</span>
    `;
    
    validateForm();
  }

  // ==========================================================================
  // FORM VALIDATION & INTERACTION
  // ==========================================================================
  studentNameInput.addEventListener("input", validateForm);

  function validateForm() {
    const isNameValid = studentNameInput.value.trim().length >= 3;
    const isPhotoCaptured = capturedBase64 !== null;
    
    if (isNameValid && isPhotoCaptured) {
      btnSubmitAttendance.disabled = false;
    } else {
      btnSubmitAttendance.disabled = true;
    }
  }

  // ==========================================================================
  // SUBMIT ATTENDANCE TO GOOGLE SPREADSHEET
  // ==========================================================================
  btnSubmitAttendance.addEventListener("click", async () => {
    const nama = studentNameInput.value.trim();
    if (!nama || !capturedBase64) return;

    // Check if Google Apps Script URL is configured
    if (!gasUrl) {
      showToast("URL Belum Diatur", "Harap atur URL Google Apps Script di menu pengaturan (ikon gerigi) terlebih dahulu.", "error");
      openSettingsModal();
      return;
    }

    // Set Loading State
    setLoadingState(true);

    // Get current date & time locally
    const now = new Date();
    
    // Formatting date: DD-MM-YYYY
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    // Formatting time: HH:MM:SS
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    const payload = {
      nama: nama,
      tanggal: formattedDate,
      jam: formattedTime,
      foto: capturedBase64
    };

    try {
      // Send POST to Google Apps Script.
      // Use mode: 'cors' since the Apps Script handles ContentService JSON redirect output cleanly.
      const response = await fetch(gasUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8" // Avoid CORS preflight OPTIONS triggers on standard setups
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status === "success") {
        showToast("Absensi Berhasil", `Presensi atas nama ${nama} berhasil tercatat!`, "success");
        
        // Save to local history
        saveToLocalHistory({
          nama: nama,
          tanggal: formattedDate,
          jam: formattedTime,
          fotoThumb: thumbnailBase64 || capturedBase64 // fallback to full if thumb failed
        });

        // Reset UI
        studentNameInput.value = "";
        clearCapture();
        
      } else {
        throw new Error(result.message || "Gagal menyimpan data ke Spreadsheet.");
      }

    } catch (error) {
      console.error("Submission error:", error);
      showToast("Absensi Gagal", `Terjadi kesalahan: ${error.message || "Hubungi admin atau periksa URL Apps Script Anda."}`, "error");
    } finally {
      setLoadingState(false);
    }
  });

  function setLoadingState(isLoading) {
    if (isLoading) {
      btnSubmitAttendance.disabled = true;
      studentNameInput.disabled = true;
      btnToggleCamera.disabled = true;
      btnCapturePhoto.disabled = true;
      btnSubmitAttendance.innerHTML = `
        <div class="btn-loading-text">
          <div class="btn-spinner"></div>
          <span>Memproses Presensi...</span>
        </div>
      `;
    } else {
      studentNameInput.disabled = false;
      btnToggleCamera.disabled = false;
      btnCapturePhoto.disabled = !isCameraActive;
      btnSubmitAttendance.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon-svg">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Absen Masuk</span>
      `;
      validateForm();
    }
  }

  // ==========================================================================
  // LOCAL STORAGE HISTORY MANAGEMENT
  // ==========================================================================
  function saveToLocalHistory(record) {
    let history = getLocalHistory();
    // Add to the beginning of list
    history.unshift(record);
    
    // Limit local list size (e.g. keep max 50 records) to protect browser storage
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  }

  function getLocalHistory() {
    const data = localStorage.getItem(STORAGE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  }

  function deleteHistoryItem(index) {
    let history = getLocalHistory();
    history.splice(index, 1);
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    renderHistory();
    showToast("Riwayat Dihapus", "Satu rekaman riwayat lokal berhasil dihapus.", "success");
  }

  function renderHistory() {
    const history = getLocalHistory();
    historyCountLabel.textContent = `${history.length} Riwayat`;
    
    if (history.length === 0) {
      historyEmptyState.classList.remove("hidden");
      historyTableBody.innerHTML = "";
      return;
    }
    
    historyEmptyState.classList.add("hidden");
    
    let rowsHTML = "";
    history.forEach((record, index) => {
      rowsHTML += `
        <tr>
          <td><strong>${index + 1}</strong></td>
          <td>
            <div class="img-thumb-container">
              <img src="${record.fotoThumb}" alt="Thumbnail Wajah" class="img-thumb" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239C8A7F%22 stroke-width=%222%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/><circle cx=%2212%22 cy=%2212%22 r=%223%22/></svg>'">
            </div>
          </td>
          <td>${escapeHTML(record.nama)}</td>
          <td>${record.tanggal}</td>
          <td><span style="font-family: monospace; font-size: 0.95rem;">${record.jam}</span></td>
          <td><span class="badge-success">Sukses</span></td>
          <td>
            <button class="btn-delete" data-index="${index}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              <span>Hapus</span>
            </button>
          </td>
        </tr>
      `;
    });
    
    historyTableBody.innerHTML = rowsHTML;

    // Attach event listeners to Delete buttons
    document.querySelectorAll(".btn-delete").forEach(button => {
      button.addEventListener("click", (e) => {
        const targetBtn = e.currentTarget;
        const index = parseInt(targetBtn.getAttribute("data-index"), 10);
        deleteHistoryItem(index);
      });
    });
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // ==========================================================================
  // CONFIGURATION MODAL (SETTINGS GEAR)
  // ==========================================================================
  function openSettingsModal() {
    settingsModal.classList.remove("hidden");
    gasUrlInput.focus();
  }

  function closeSettingsModal() {
    settingsModal.classList.add("hidden");
    // Reset inputs to saved values
    gasUrlInput.value = gasUrl;
  }

  btnOpenSettings.addEventListener("click", openSettingsModal);
  btnCloseSettings.addEventListener("click", closeSettingsModal);
  btnCancelSettings.addEventListener("click", closeSettingsModal);
  
  btnSaveSettings.addEventListener("click", () => {
    const inputVal = gasUrlInput.value.trim();
    if (inputVal && !isValidURL(inputVal)) {
      showToast("URL Tidak Valid", "Pastikan memasukkan format URL Google Apps Script yang benar.", "error");
      return;
    }
    
    gasUrl = inputVal;
    localStorage.setItem(STORAGE_URL_KEY, gasUrl);
    closeSettingsModal();
    showToast("Pengaturan Disimpan", "URL Google Apps Script berhasil diperbarui.", "success");
  });

  // Close modal when clicking on overlay background
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  });

  function isValidURL(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ==========================================================================
  // TOAST NOTIFICATIONS SYSTEM
  // ==========================================================================
  function showToast(title, message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconSVG = "";
    if (type === "success") {
      iconSVG = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      `;
    } else {
      iconSVG = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      `;
    }

    toast.innerHTML = `
      ${iconSVG}
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    toastContainer.appendChild(toast);

    // Toast Close Button event
    toast.querySelector(".toast-close").addEventListener("click", () => {
      dismissToast(toast);
    });

    // Auto-dismiss toast after 5 seconds
    setTimeout(() => {
      dismissToast(toast);
    }, 5000);
  }

  function dismissToast(toast) {
    if (toast.parentNode) {
      toast.classList.add("toast-closing");
      toast.addEventListener("animationend", () => {
        toast.remove();
      });
    }
  }
});
