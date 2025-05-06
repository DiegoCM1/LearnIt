"use strict";

// --- DOM Elements ---
// Get references to the elements you added in the HTML
const recordingSection = document.getElementById('recordingSection');
const livePreview = document.getElementById('livePreview');
const recordedPlayback = document.getElementById('recordedPlayback');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const downloadLink = document.getElementById('downloadLink');
const finishRecordingBtn = document.getElementById('finishRecordingBtn');
const learnTeachingMainOptions = document.getElementById("learnTeachingMainOptions");
const recordOption = document.getElementById("recordOption");

// --- State Variables ---
let mediaRecorder; // Holds the MediaRecorder instance
let recordedChunks = []; // Stores the chunks of recorded data
let mediaStream; // Holds the stream from camera/mic

/**
 * Checks and returns a supported MIME type for MediaRecorder.
 * Prefers VP9/Opus in WebM container if available.
 */
function getSupportedMimeType() {
    const mimeTypes = [
        'video/webm;codecs=vp9,opus', // High quality, widely supported modern codecs
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/mp4;codecs=h264,aac', // MP4 support can be less consistent across browsers for recording
        'video/webm', // Generic WebM fallback
    ];
    for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
            console.log("Using MIME type:", mimeType);
            return { mimeType: mimeType };
        }
    }
    console.warn("No preferred MIME type supported, using browser default.");
    return undefined; // Let the browser decide (might be less optimal)
}

/**
 * Guesses a file extension based on the MIME type.
 * @param {string} mimeType
 * @returns {string} File extension (e.g., 'webm', 'mp4')
 */
function getExtension(mimeType = '') {
    if (mimeType.startsWith('video/webm')) return 'webm';
    if (mimeType.startsWith('video/mp4')) return 'mp4';
    return 'bin'; // Default binary extension
}

/**
 * Cleans up the media stream tracks (stops camera/mic).
 */
function cleanupStream() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        console.log("Media stream tracks stopped.");
        mediaStream = null;
        livePreview.srcObject = null; // Detach from preview element
    }
}

/**
 * Resets the UI elements related to recording.
 */
function resetRecordingUI() {
    recordingSection.style.display = 'none'; // Hide the whole recording section
    livePreview.style.display = 'block'; // Ensure preview area is visible when section shows
    recordedPlayback.style.display = 'none'; // Hide playback area
    recordedPlayback.src = ''; // Clear previous video source
    downloadLink.style.display = 'none'; // Hide download link
    downloadLink.href = '#'; // Reset href
    finishRecordingBtn.style.display = 'none'; // Hide finish button
    stopRecordBtn.style.display = 'block'; // Show stop button
    learnTeachingMainOptions.style.display = "grid"; // Show main options as grid

    // Revoke previous object URLs to free memory
    const previousUrl = recordedPlayback.src;
    if (previousUrl && previousUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl);
        console.log("Revoked previous Object URL:", previousUrl);
    }
    const previousDownloadUrl = downloadLink.href;
    if (previousDownloadUrl && previousDownloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousDownloadUrl);
        console.log("Revoked previous Download URL:", previousDownloadUrl);
    }
}

/**
 * Main function to start the recording process.
 */
async function recordUser() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        console.log("Already recording.");
        return;
    }

    resetRecordingUI(); // Clear any previous recording state first
    recordedChunks = []; // Reset chunks array

    if (learnTeachingMainOptions) learnTeachingMainOptions.style.display = "none";
    recordingSection.style.display = 'block'; // Show the recording UI

    try {
        // 1. Request Camera and Microphone Access
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user', // Prefer front camera
            },
            audio: {}
        });
        console.log("Media stream acquired.");

        // 2. Display Live Preview
        livePreview.srcObject = mediaStream;

        // 3. Setup MediaRecorder
        const options = getSupportedMimeType(); // Get preferred/supported MIME type
        mediaRecorder = new MediaRecorder(mediaStream, options);

        // 4. Event Listener for Data Chunks
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        // 5. Event Listener for Recording Stop
        mediaRecorder.onstop = () => {
            console.log("Recording stopped. Processing blob...");
            if (recordedChunks.length === 0) {
                console.warn("No data chunks recorded.");
                resetRecordingUI(); // Reset UI if nothing was recorded
                cleanupStream(); // Still release camera
                return;
            }
            // Determine MIME type for the blob (use the recorder's type if available)
            const blobMimeType = mediaRecorder.mimeType || (options ? options.mimeType : 'video/webm');
            const blob = new Blob(recordedChunks, { type: blobMimeType });

            // Create URL for playback and download
            const videoURL = URL.createObjectURL(blob);
            recordedPlayback.src = videoURL;
            downloadLink.href = videoURL;

            // Suggest a filename
            const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
            const fileExtension = getExtension(blobMimeType);
            downloadLink.download = `learnit_recording_${timestamp}.${fileExtension}`;

            // Update UI for playback/download
            recordedPlayback.style.display = 'block';
            downloadLink.style.display = 'inline-block'; // Show download button
            finishRecordingBtn.style.display = 'inline-block'; // Show finish button
            livePreview.style.display = 'none'; // Hide live preview
            stopRecordBtn.style.display = 'none'; // Hide stop button

            cleanupStream(); // Release camera/mic now that blob is created
            recordedChunks = []; // Clear chunks for next potential recording within the session
            console.log("Blob created:", videoURL, "Type:", blobMimeType);
        };

        // Handle Errors during recording
        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            alert(`Recording error: ${event.error.name}. Please try again.`);
            cleanupStream(); // Clean up stream on error
            resetRecordingUI(); // Reset UI
        };

        // 6. Start Recording
        mediaRecorder.start(); // Record continuously until stop() is called
        console.log("MediaRecorder started, state:", mediaRecorder.state);
        stopRecordBtn.style.display = 'inline-block'; // Show the stop button

    } catch (err) {
        console.error("Error initializing recording:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            alert('Permission Denied: Please allow access to your camera and microphone in your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            alert('Error: No camera or microphone found on this device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            alert('Error: Your camera or microphone might be busy or malfunctioning. Please check if another application is using it.');
        } else {
            alert(`An error occurred while accessing camera/microphone: ${err.name}`);
        }
        resetRecordingUI(); // Reset UI on failure
    }
}

/**
 * Function to stop the recording process.
 */
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop(); // This triggers the 'onstop' event handler above
        console.log("Stop recording requested...");
    } else {
        console.warn("Stop requested but MediaRecorder not recording or not initialized.");
    }
}

// --- Event Listeners ---

// Add listener to the Stop button
stopRecordBtn.addEventListener('click', stopRecording);

// Add listener to the Finish button (to hide recording section and show main options)
finishRecordingBtn.addEventListener('click', resetRecordingUI);

// Add listener to the Record Option button
recordOption.addEventListener('click', () => {
    learnTeachingMainOptions.style.display = "none";
    recordUser();
});

// --- Initial Setup ---
// Ensure recording section is hidden initially if it wasn't already
if (recordingSection) recordingSection.style.display = 'none';