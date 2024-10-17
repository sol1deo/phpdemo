// script.js
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadedClipsContainer = document.getElementById('uploadedClips');
    const videoPreview = document.getElementById('videoPreview');
    const timeline = document.getElementById('timeline');
    const rows = document.querySelectorAll('.row');
    const cursor = document.getElementById('cursor');
    const timeMarkersContainer = document.getElementById('timeMarkers');
    const timelineWidth = 1000;  // Width in pixels
    const totalTimelineDuration = 300;  // Total timeline duration in seconds (5 minutes)
    let draggedClip = null;
    let offsetX = 0;
    let isPlaying = false;
    let timelineClips = [];   // Array to store clips on the timeline
    let playbackRequestId = null;

    // Initialize the video preview's dataset
    videoPreview.dataset.url = '';

    // Set initial cursor position
    cursor.style.left = '0px';

    // Generate time markers
    function generateTimeMarkers() {
        const markerInterval = 30; // Every 30 seconds
        const numMarkers = totalTimelineDuration / markerInterval;
        for (let i = 0; i <= numMarkers; i++) {
            const marker = document.createElement('div');
            marker.classList.add('time-marker');
            const timeInSeconds = i * markerInterval;
            const leftPosition = (timeInSeconds / totalTimelineDuration) * timelineWidth;
            marker.style.left = `${leftPosition}px`;
            marker.textContent = `${formatTime(timeInSeconds)}`;
            timeMarkersContainer.appendChild(marker);
        }
    }

    generateTimeMarkers();

    // Helper function to format time in MM:SS
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Handle file uploads
    fileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        Array.from(files).forEach((file) => {
            // Create a temporary video element to get duration
            const tempVideo = document.createElement('video');
            tempVideo.preload = 'metadata';
            tempVideo.src = URL.createObjectURL(file);
            tempVideo.onloadedmetadata = function() {
                const duration = tempVideo.duration; // Duration in seconds
                URL.revokeObjectURL(tempVideo.src);

                const clip = document.createElement('div');
                clip.classList.add('clip');
                clip.draggable = true; // Make the library clip draggable
                clip.textContent = file.name;
                clip.file = file;  // Attach the file to the clip element
                clip.dataset.duration = duration;  // Store duration in dataset
                const videoURL = URL.createObjectURL(file);
                clip.dataset.url = videoURL;  // Store the URL

                // Add drag event listeners for the clip
                clip.addEventListener('dragstart', (e) => {
                    draggedClip = clip;
                    offsetX = e.offsetX;
                    e.dataTransfer.setData('text/plain', clip.textContent);
                });

                // Append the new clip to the uploaded clips container
                uploadedClipsContainer.appendChild(clip);

                // Show preview on click
                clip.addEventListener('click', () => {
                    setVideoSource(videoURL, 0);
                    isPlaying = true;  // Set initial state to playing
                    videoPreview.play();
                });
            };
        });
    });

    // Make rows valid drop zones for clips
    rows.forEach(row => {
        row.addEventListener('dragover', (e) => {
            e.preventDefault();  // Necessary to allow drop
        });

        row.addEventListener('drop', (e) => {
            e.preventDefault();
            const clip = draggedClip;

            // Check if the clip is from the library
            if (!clip) return;

            // Calculate the clip's width based on its duration
            const duration = parseFloat(clip.dataset.duration);  // Duration in seconds
            const clipWidth = (duration / totalTimelineDuration) * timelineWidth;

            // Clone the clip to create a separate instance on the timeline
            const timelineClip = clip.cloneNode(true);
            timelineClip.classList.add('timeline-clip'); // Add a class to identify timeline clips
            timelineClip.draggable = false; // Prevent default drag-and-drop on timeline clips
            timelineClip.style.width = `${clipWidth}px`;
            timelineClip.style.position = 'absolute';
            timelineClip.style.top = '0px';

            // Position the dropped clip on the row
            let dropPosition = e.offsetX - offsetX;
            // Ensure the clip doesn't overflow the timeline
            dropPosition = Math.max(0, Math.min(dropPosition, timelineWidth - clipWidth));
            timelineClip.style.left = `${dropPosition}px`;

            // Append the clip to the timeline row
            row.appendChild(timelineClip);

            // Store the clip's position and information
            const clipInfo = {
                element: timelineClip,
                file: clip.file,
                url: clip.dataset.url,
                row: row,
                startPosition: dropPosition,
                initialStartPosition: dropPosition, // Added
                duration: duration,
                width: clipWidth,
                originalWidth: clipWidth, // Added
                trimStart: 0,
                trimEnd: 0
            };

            timelineClips.push(clipInfo);

            // Enable dragging within the timeline after placing
            enableClipDragging(timelineClip, clipInfo);

            // Reset draggedClip
            draggedClip = null;
        });
    });

    // Function to enable dragging on the timeline itself
    function enableClipDragging(clip, clipInfo) {
        // Add resize handles
        const leftHandle = document.createElement('div');
        leftHandle.classList.add('resize-handle', 'left-handle');
        clip.appendChild(leftHandle);

        const rightHandle = document.createElement('div');
        rightHandle.classList.add('resize-handle', 'right-handle');
        clip.appendChild(rightHandle);

        enableClipResizing(leftHandle, clip, clipInfo, 'left');
        enableClipResizing(rightHandle, clip, clipInfo, 'right');

        // Prevent default drag-and-drop behavior on the timeline clip
        clip.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });

        // Add click event to display clip information and speed graph
        clip.addEventListener('click', (e) => {
            e.stopPropagation();

            // Display clip information in the effects panel
            displayClipInfo(clipInfo);
        });

        clip.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only respond to left clicks

            // Ignore mousedown on resize handles
            if (e.target.classList.contains('resize-handle')) {
                return;
            }

            draggedClip = clip;
            offsetX = e.offsetX;  // Store initial click position for smooth drag

            e.stopPropagation(); // Prevent dragging the timeline cursor

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);

            function onMouseMove(e) {
                if (draggedClip) {
                    // Get the parent row of the clip
                    const row = draggedClip.parentElement;
                    const rowRect = row.getBoundingClientRect();
                    // Calculate new left position
                    let newLeft = e.clientX - rowRect.left - offsetX;
                    // Get clip width
                    const clipWidth = draggedClip.offsetWidth;
                    // Restrict movement within the row horizontally
                    newLeft = Math.max(0, Math.min(newLeft, timelineWidth - clipWidth));
                    draggedClip.style.left = `${newLeft}px`;

                    // Update clip's start position in the timelineClips array
                    clipInfo.startPosition = newLeft;
                }
            }

            function onMouseUp() {
                draggedClip = null;  // Reset after dragging
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        });
    }

    // Function to enable resizing on the clip
    function enableClipResizing(handle, clip, clipInfo, side) {
        handle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only respond to left clicks
            e.stopPropagation(); // Prevent initiating clip dragging
            e.preventDefault();

            let isResizing = true;
            const initialMouseX = e.clientX;
            const initialClipLeft = parseFloat(clip.style.left);
            const initialClipWidth = parseFloat(clip.style.width);

            const moveResize = (e) => {
                if (isResizing) {
                    const deltaX = e.clientX - initialMouseX;

                    if (side === 'left') {
                        let newLeft = initialClipLeft + deltaX;
                        let newWidth = initialClipWidth - deltaX;

                        // Ensure the clip doesn't go beyond the row boundaries
                        if (newLeft < 0) {
                            newWidth += newLeft;
                            newLeft = 0;
                        }

                        // Minimum clip width
                        if (newWidth < 10) {
                            newWidth = 10;
                            newLeft = initialClipLeft + (initialClipWidth - 10);
                        }

                        clip.style.left = `${newLeft}px`;
                        clip.style.width = `${newWidth}px`;

                        // Update clipInfo
                        clipInfo.startPosition = newLeft;
                        clipInfo.width = newWidth;

                        // Adjust the trim start time
                        const totalWidthChange = initialClipWidth - newWidth;
                        const trimStartChange = (totalWidthChange / timelineWidth) * totalTimelineDuration;
                        clipInfo.trimStart += trimStartChange;

                        // Ensure trimStart is within bounds
                        clipInfo.trimStart = Math.max(0, Math.min(clipInfo.trimStart, clipInfo.duration - clipInfo.trimEnd));
                    } else if (side === 'right') {
                        let newWidth = initialClipWidth + deltaX;

                        // Ensure the clip doesn't go beyond the row boundaries
                        if (initialClipLeft + newWidth > timelineWidth) {
                            newWidth = timelineWidth - initialClipLeft;
                        }

                        // Minimum clip width
                        if (newWidth < 10) {
                            newWidth = 10;
                        }

                        clip.style.width = `${newWidth}px`;

                        // Update clipInfo
                        clipInfo.width = newWidth;

                        // Adjust the trim end time
                        const totalWidthChange = newWidth - initialClipWidth;
                        const trimEndChange = (totalWidthChange / timelineWidth) * totalTimelineDuration;
                        clipInfo.trimEnd -= trimEndChange;

                        // Ensure trimEnd is within bounds
                        clipInfo.trimEnd = Math.max(0, Math.min(clipInfo.trimEnd, clipInfo.duration - clipInfo.trimStart));
                    }
                }
            };

            const stopResizing = () => {
                isResizing = false;
                document.removeEventListener('mousemove', moveResize);
                document.removeEventListener('mouseup', stopResizing);
            };

            document.addEventListener('mousemove', moveResize);
            document.addEventListener('mouseup', stopResizing);
        });

        // Add double-click event for entering timecode
        handle.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Create and display the custom modal
            showTimecodeModal(clipInfo, side);
        });
    }

    // Function to create and display the custom modal
    function showTimecodeModal(clipInfo, side) {
        // Create the modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.classList.add('modal-overlay');

        // Create the modal container
        const modalContainer = document.createElement('div');
        modalContainer.classList.add('modal-container');

        // Create the modal content
        const modalContent = document.createElement('div');
        modalContent.classList.add('modal-content');

        // Add header
        const modalHeader = document.createElement('h2');
        modalHeader.textContent = side === 'left' ? 'Set In-Point Timecode' : 'Set Out-Point Timecode';
        modalContent.appendChild(modalHeader);

        // Add input field
        const timecodeInput = document.createElement('input');
        timecodeInput.type = 'text';
        timecodeInput.placeholder = 'HH:MM:SS';
        timecodeInput.classList.add('timecode-input');
        modalContent.appendChild(timecodeInput);

        // Add buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('modal-buttons');

        // Add Confirm button
        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Confirm';
        confirmButton.classList.add('modal-button', 'confirm-button');
        buttonsContainer.appendChild(confirmButton);

        // Add Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.classList.add('modal-button', 'cancel-button');
        buttonsContainer.appendChild(cancelButton);

        modalContent.appendChild(buttonsContainer);
        modalContainer.appendChild(modalContent);
        modalOverlay.appendChild(modalContainer);
        document.body.appendChild(modalOverlay);

        // Focus on the input field
        timecodeInput.focus();

        // Event listener for Confirm button
        confirmButton.addEventListener('click', () => {
            const timeInput = timecodeInput.value;
            processTimecodeInput(timeInput, clipInfo, side);
            document.body.removeChild(modalOverlay);
        });

        // Event listener for Cancel button
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
        });

        // Close modal on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
            }
        });

        // Handle Enter key press in input field
        timecodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                confirmButton.click();
            }
        });
    }

    function processTimecodeInput(timeInput, clipInfo, side) {
        const seconds = timecodeToSeconds(timeInput);
        if (!isNaN(seconds) && seconds >= 0 && seconds <= clipInfo.duration) {
            const clip = clipInfo.element;
            if (side === 'left') {
                // Adjust trimStart
                clipInfo.trimStart = seconds;

                // Update clip position and width
                const totalTimelinePxPerSec = timelineWidth / totalTimelineDuration;
                const newWidth = ((clipInfo.duration - clipInfo.trimStart - clipInfo.trimEnd) / clipInfo.duration) * clipInfo.originalWidth;
                const newLeft = (clipInfo.startPosition / clipInfo.duration) * clipInfo.trimStart * totalTimelinePxPerSec + clipInfo.initialStartPosition;

                clip.style.left = `${newLeft}px`;
                clip.style.width = `${newWidth}px`;

                // Update clipInfo
                clipInfo.startPosition = newLeft;
                clipInfo.width = newWidth;
            } else if (side === 'right') {
                // Adjust trimEnd
                clipInfo.trimEnd = clipInfo.duration - seconds;

                // Update clip width
                const totalTimelinePxPerSec = timelineWidth / totalTimelineDuration;
                const newWidth = ((clipInfo.duration - clipInfo.trimStart - clipInfo.trimEnd) / clipInfo.duration) * clipInfo.originalWidth;

                clip.style.width = `${newWidth}px`;

                // Update clipInfo
                clipInfo.width = newWidth;
            }
        } else {
            alert("Invalid timecode.");
        }
    }

    function timecodeToSeconds(timecode) {
        const parts = timecode.split(':').map(Number);
        if (parts.length === 3) {
            const [hours, minutes, seconds] = parts;
            return hours * 3600 + minutes * 60 + seconds;
        } else if (parts.length === 2) {
            const [minutes, seconds] = parts;
            return minutes * 60 + seconds;
        } else if (parts.length === 1) {
            return parts[0];
        } else {
            return NaN;
        }
    }

    // References to the speed graph elements
    const speedGraphContainer = document.getElementById('speedGraphContainer');
    const speedGraphCanvas = document.getElementById('speedGraphCanvas');
    const speedGraphCtx = speedGraphCanvas.getContext('2d');

    // Variables for speed graph
    let controlPoints = [];
    let selectedControlPoint = null;
    let isDraggingControlPoint = false;
    let currentClipInfo = null;

    // Function to display clip information and speed graph
    function displayClipInfo(clipInfo) {
        const clipDurationElement = document.getElementById('clipDuration');
        const clipResolutionElement = document.getElementById('clipResolution');
        const clipFrameRateElement = document.getElementById('clipFrameRate');

        // Create a temporary video element to extract metadata
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = clipInfo.url;

        tempVideo.onloadedmetadata = function() {
            // Duration in seconds
            const duration = tempVideo.duration;
            clipDurationElement.textContent = formatTime(duration);

            // Resolution
            const width = tempVideo.videoWidth;
            const height = tempVideo.videoHeight;
            clipResolutionElement.textContent = `${width} x ${height}`;

            // Frame Rate
            let frameRate = tempVideo.getVideoPlaybackQuality
                ? tempVideo.getVideoPlaybackQuality().totalVideoFrames / duration
                : 30; // Default to 30 FPS

            frameRate = Math.round(frameRate * 100) / 100; // Round to two decimals
            clipFrameRateElement.textContent = `${frameRate} FPS`;

            // Clean up the temporary video element
            tempVideo.src = '';
            tempVideo.load();
        };

        // Handle error loading metadata
        tempVideo.onerror = function() {
            clipDurationElement.textContent = 'N/A';
            clipResolutionElement.textContent = 'N/A';
            clipFrameRateElement.textContent = 'N/A';
        };

        // Set current clip info for speed graph
        currentClipInfo = clipInfo;

        // Load or initialize control points
        if (clipInfo.speedControlPoints) {
            controlPoints = clipInfo.speedControlPoints;
        } else {
            // Initialize with linear speed (normal speed throughout)
            controlPoints = [
                { x: 0, y: 1 },
                { x: 1, y: 1 }
            ];
            clipInfo.speedControlPoints = controlPoints;
        }

        // Render the speed graph
        renderSpeedGraph();
    }

    // Function to render the speed graph
    function renderSpeedGraph() {
        const width = speedGraphCanvas.width;
        const height = speedGraphCanvas.height;

        // Clear canvas
        speedGraphCtx.clearRect(0, 0, width, height);

        // Draw background grid
        drawGrid();

        // Draw the speed curve
        drawSpeedCurve();

        // Draw control points
        drawControlPoints();
    }

    // Function to draw grid lines
    function drawGrid() {
        const width = speedGraphCanvas.width;
        const height = speedGraphCanvas.height;
        const numLines = 4;

        speedGraphCtx.strokeStyle = '#3c3c3c';
        speedGraphCtx.lineWidth = 1;

        // Horizontal lines
        for (let i = 1; i < numLines; i++) {
            const y = (height / numLines) * i;
            speedGraphCtx.beginPath();
            speedGraphCtx.moveTo(0, y);
            speedGraphCtx.lineTo(width, y);
            speedGraphCtx.stroke();
        }

        // Vertical lines
        for (let i = 1; i < numLines; i++) {
            const x = (width / numLines) * i;
            speedGraphCtx.beginPath();
            speedGraphCtx.moveTo(x, 0);
            speedGraphCtx.lineTo(x, height);
            speedGraphCtx.stroke();
        }
    }

    // Function to draw the speed curve
    function drawSpeedCurve() {
        if (controlPoints.length < 2) return;

        speedGraphCtx.strokeStyle = '#4a90e2';
        speedGraphCtx.lineWidth = 2;

        speedGraphCtx.beginPath();
        for (let i = 0; i < controlPoints.length; i++) {
            const cp = controlPoints[i];
            const x = cp.x * speedGraphCanvas.width;
            const y = (1 - cp.y) * speedGraphCanvas.height;

            if (i === 0) {
                speedGraphCtx.moveTo(x, y);
            } else {
                speedGraphCtx.lineTo(x, y);
            }
        }
        speedGraphCtx.stroke();
    }

    // Function to draw control points
    function drawControlPoints() {
        controlPoints.forEach(cp => {
            const x = cp.x * speedGraphCanvas.width;
            const y = (1 - cp.y) * speedGraphCanvas.height;

            speedGraphCtx.fillStyle = '#e74c3c';
            speedGraphCtx.strokeStyle = '#ffffff';
            speedGraphCtx.lineWidth = 2;

            speedGraphCtx.beginPath();
            speedGraphCtx.arc(x, y, 6, 0, Math.PI * 2);
            speedGraphCtx.fill();
            speedGraphCtx.stroke();
        });
    }

    // Handle mouse events for interactivity
    speedGraphCanvas.addEventListener('mousedown', onCanvasMouseDown);
    speedGraphCanvas.addEventListener('mousemove', onCanvasMouseMove);
    speedGraphCanvas.addEventListener('mouseup', onCanvasMouseUp);
    speedGraphCanvas.addEventListener('mouseleave', onCanvasMouseUp);

    function onCanvasMouseDown(e) {
        const rect = speedGraphCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / speedGraphCanvas.width;
        const y = 1 - (e.clientY - rect.top) / speedGraphCanvas.height;

        // Check if a control point is clicked
        selectedControlPoint = getControlPointAt(x, y);

        if (selectedControlPoint) {
            isDraggingControlPoint = true;
        } else {
            // Add new control point
            controlPoints.push({ x: x, y: y });
            // Sort control points by x position (time)
            controlPoints.sort((a, b) => a.x - b.x);
            isDraggingControlPoint = false;
        }

        renderSpeedGraph();
    }

    function onCanvasMouseMove(e) {
        if (!isDraggingControlPoint || !selectedControlPoint) return;

        const rect = speedGraphCanvas.getBoundingClientRect();
        let x = (e.clientX - rect.left) / speedGraphCanvas.width;
        let y = 1 - (e.clientY - rect.top) / speedGraphCanvas.height;

        // Clamp values between 0 and 1
        x = Math.max(0, Math.min(x, 1));
        y = Math.max(0, Math.min(y, 1));

        selectedControlPoint.x = x;
        selectedControlPoint.y = y;

        // Ensure control points are sorted
        controlPoints.sort((a, b) => a.x - b.x);

        renderSpeedGraph();
    }

    function onCanvasMouseUp(e) {
        isDraggingControlPoint = false;
        selectedControlPoint = null;

        // Save the control points back to the clip info
        if (currentClipInfo) {
            currentClipInfo.speedControlPoints = controlPoints;
        }
    }

    function getControlPointAt(x, y) {
        const threshold = 0.03; // Sensitivity for selecting a control point
        return controlPoints.find(cp => {
            const dx = cp.x - x;
            const dy = cp.y - y;
            return dx * dx + dy * dy < threshold * threshold;
        });
    }

    // Modify the playback rate based on the speed graph during playback
    // Update your playback functions to consider the speed graph

    // Modify the startPlayback function to adjust playback rate
    function startPlayback() {
        isPlaying = true;
        const cursorLeft = parseFloat(cursor.style.left);
        let playbackTime = (cursorLeft / timelineWidth) * totalTimelineDuration;

        const playbackStartTimestamp = Date.now();

        function playbackLoop() {
            if (!isPlaying) return;

            const elapsedTime = (Date.now() - playbackStartTimestamp) / 1000;
            let currentTime = playbackTime + elapsedTime;

            if (currentTime >= totalTimelineDuration) {
                pausePlayback();
                return;
            }

            cursor.style.left = `${(currentTime / totalTimelineDuration) * timelineWidth}px`;

            const clipUnderCursor = getClipAtTime(currentTime);

            if (clipUnderCursor) {
                const clipStartTime = (clipUnderCursor.startPosition / timelineWidth) * totalTimelineDuration;
                const clipCurrentTime = currentTime - clipStartTime;

                // Adjusted clip time considering trimStart and trimEnd
                let adjustedClipCurrentTime = clipUnderCursor.trimStart + clipCurrentTime;

                // Calculate playback rate based on speed graph
                const playbackRate = getPlaybackRateAtTime(clipUnderCursor, adjustedClipCurrentTime);

                if (adjustedClipCurrentTime >= clipUnderCursor.trimStart && adjustedClipCurrentTime <= clipUnderCursor.duration - clipUnderCursor.trimEnd) {
                    if (videoPreview.dataset.url !== clipUnderCursor.url) {
                        setVideoSource(clipUnderCursor.url, adjustedClipCurrentTime, () => {
                            videoPreview.playbackRate = playbackRate;
                            videoPreview.play();
                        });
                    } else {
                        if (videoPreview.readyState >= 1) {
                            if (Math.abs(videoPreview.currentTime - adjustedClipCurrentTime) > 0.1) {
                                videoPreview.currentTime = adjustedClipCurrentTime;
                            }
                            if (videoPreview.paused) {
                                videoPreview.playbackRate = playbackRate;
                                videoPreview.play();
                            }
                        } else {
                            videoPreview.onloadedmetadata = function() {
                                videoPreview.currentTime = adjustedClipCurrentTime;
                                videoPreview.playbackRate = playbackRate;
                                videoPreview.play();
                                videoPreview.onloadedmetadata = null;
                            };
                        }
                    }
                } else {
                    // Outside of clip duration
                    if (videoPreview.src !== '') {
                        videoPreview.pause();
                        videoPreview.src = '';
                        videoPreview.load();
                    }
                }
            } else {
                // No clip under cursor
                if (videoPreview.src !== '') {
                    videoPreview.pause();
                    videoPreview.src = '';
                    videoPreview.load();
                }
            }

            playbackRequestId = requestAnimationFrame(playbackLoop);
        }

        playbackRequestId = requestAnimationFrame(playbackLoop);
    }

    // Function to get playback rate at a specific time based on the speed graph
    function getPlaybackRateAtTime(clipInfo, clipCurrentTime) {
        if (!clipInfo.speedControlPoints || clipInfo.speedControlPoints.length < 2) {
            return 1; // Default playback rate
        }

        const clipDuration = clipInfo.duration - clipInfo.trimStart - clipInfo.trimEnd;
        const normalizedTime = (clipCurrentTime - clipInfo.trimStart) / clipDuration;

        // Find the two control points surrounding the current time
        let prevCP = clipInfo.speedControlPoints[0];
        for (let i = 1; i < clipInfo.speedControlPoints.length; i++) {
            const nextCP = clipInfo.speedControlPoints[i];
            if (normalizedTime <= nextCP.x) {
                // Interpolate between prevCP and nextCP
                const t = (normalizedTime - prevCP.x) / (nextCP.x - prevCP.x);
                const playbackRate = prevCP.y + t * (nextCP.y - prevCP.y);
                return playbackRate * 2; // Multiply to get a reasonable speed range
            }
            prevCP = nextCP;
        }

        // If beyond the last control point
        return prevCP.y * 2;
    }

    // Function to set the video source and handle loading
    function setVideoSource(url, currentTime, callback) {
        if (videoPreview.src !== url) {
            videoPreview.pause(); // Pause before changing the source
            videoPreview.src = url;
            videoPreview.dataset.url = url;
            videoPreview.onloadedmetadata = function() {
                videoPreview.currentTime = currentTime;
                if (callback) callback();
                videoPreview.onloadedmetadata = null; // Clean up the event listener
            };
            videoPreview.load();
        } else {
            // Video source is the same, set currentTime directly
            if (videoPreview.readyState >= 1) { // Have metadata
                videoPreview.currentTime = currentTime;
                if (callback) callback();
            } else {
                videoPreview.onloadedmetadata = function() {
                    videoPreview.currentTime = currentTime;
                    if (callback) callback();
                    videoPreview.onloadedmetadata = null; // Clean up the event listener
                };
            }
        }
    }

    // Function to update the video preview based on cursor position
    function updatePreviewAtCursor() {
        const cursorLeft = parseFloat(cursor.style.left);
        const currentTime = (cursorLeft / timelineWidth) * totalTimelineDuration;

        // Find the clip under the cursor
        const clipUnderCursor = getClipAtTime(currentTime);

        if (clipUnderCursor) {
            const clipStartTime = (clipUnderCursor.startPosition / timelineWidth) * totalTimelineDuration;
            const clipCurrentTime = currentTime - clipStartTime;

            // Adjusted clip time considering trimStart and trimEnd
            let adjustedClipCurrentTime = clipUnderCursor.trimStart + clipCurrentTime;

            // Calculate playback rate based on speed graph
            const playbackRate = getPlaybackRateAtTime(clipUnderCursor, adjustedClipCurrentTime);

            if (adjustedClipCurrentTime >= clipUnderCursor.trimStart && adjustedClipCurrentTime <= clipUnderCursor.duration - clipUnderCursor.trimEnd) {
                setVideoSource(clipUnderCursor.url, adjustedClipCurrentTime);
                videoPreview.playbackRate = playbackRate;
                if (!isPlaying) {
                    videoPreview.pause();
                }
            } else {
                // Outside of clip duration
                if (videoPreview.src !== '') {
                    videoPreview.pause();
                    videoPreview.src = '';
                    videoPreview.load();
                }
            }
        } else {
            // No clip under cursor
            if (videoPreview.src !== '') {
                videoPreview.pause();
                videoPreview.src = '';
                videoPreview.load();
            }
        }
    }

    // Function to get the clip at a specific time
    function getClipAtTime(time) {
        // Sort the clips by start time
        const sortedClips = timelineClips.slice().sort((a, b) => {
            const aStart = (a.startPosition / timelineWidth) * totalTimelineDuration;
            const bStart = (b.startPosition / timelineWidth) * totalTimelineDuration;
            return aStart - bStart;
        });

        for (let clipInfo of sortedClips) {
            const clipStartTime = (clipInfo.startPosition / timelineWidth) * totalTimelineDuration;
            const clipEndTime = clipStartTime + ((clipInfo.width / timelineWidth) * totalTimelineDuration);
            if (time >= clipStartTime && time < clipEndTime) {
                return clipInfo;
            }
        }
        return null;
    }

    // Handle dragging the cursor on the timeline
    timeline.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only respond to left mouse button
        e.preventDefault();

        let isDragging = true;

        const moveCursor = (e) => {
            if (isDragging) {
                const timelineRect = timeline.getBoundingClientRect();
                let newLeft = e.clientX - timelineRect.left;
                newLeft = Math.max(0, Math.min(newLeft, timelineWidth));
                cursor.style.left = `${newLeft}px`;

                // Update the video preview
                updatePreviewAtCursor();
            }
        };

        const stopDragging = () => {
            isDragging = false;
            document.removeEventListener('mousemove', moveCursor);
            document.removeEventListener('mouseup', stopDragging);
        };

        document.addEventListener('mousemove', moveCursor);
        document.addEventListener('mouseup', stopDragging);

        // Move cursor to initial click position
        moveCursor(e);
    });

    // Play or pause the video when the spacebar is pressed
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();  // Prevent default spacebar scrolling behavior
            if (isPlaying) {
                pausePlayback();
            } else {
                startPlayback();
            }
        }
    });

    // Function to pause playback
    function pausePlayback() {
        isPlaying = false;
        if (playbackRequestId) {
            cancelAnimationFrame(playbackRequestId);
            playbackRequestId = null;
        }
        videoPreview.pause();
    }

    // Update the preview when the page loads
    updatePreviewAtCursor();

    // Helper function to format time in HH:MM:SS
    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
});

const exportButton = document.getElementById('exportButton');
exportButton.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent default behavior
    exportVideo();
});

// Function to export the video
async function exportVideo() {
    // Show a loading indicator
    exportButton.textContent = 'Exporting...';
    exportButton.style.pointerEvents = 'none';

    // Initialize ffmpeg
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });

    // Get the export button
    const exportButton = document.getElementById('exportButton');
    exportButton.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default anchor behavior
        exportVideo();
    });

    // Function to export the video
    async function exportVideo() {
        // Show a loading indicator
        exportButton.textContent = 'Exporting...';
        exportButton.style.pointerEvents = 'none';

        // Load FFmpeg if not already loaded
        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load();
        }

        // Process each clip
        for (let i = 0; i < timelineClips.length; i++) {
            const clipInfo = timelineClips[i];
            const clipName = `clip${i}.mp4`;
            const trimmedClipName = `trimmed_clip${i}.mp4`;
            const adjustedClipName = `adjusted_clip${i}.mp4`;

            // Write the original file to ffmpeg FS
            const data = await fetchFile(clipInfo.file);
            ffmpeg.FS('writeFile', clipName, data);

            // Calculate trim times
            const trimStart = clipInfo.trimStart;
            const trimEnd = clipInfo.duration - clipInfo.trimEnd;

            // Trim the clip
            await ffmpeg.run(
                '-i', clipName,
                '-ss', trimStart.toString(),
                '-to', trimEnd.toString(),
                '-c', 'copy',
                trimmedClipName
            );

            // Adjust speed (assuming constant speed multiplier for now)
            const speedMultiplier = await generateSpeedFilter(clipInfo);

            if (speedMultiplier !== 1) {
                // Apply speed adjustment
                await ffmpeg.run(
                    '-i', trimmedClipName,
                    '-filter_complex', `[0:v]setpts=${(1 / speedMultiplier)}*PTS[v];[0:a]atempo=${speedMultiplier}[a]`,
                    '-map', '[v]',
                    '-map', '[a]',
                    adjustedClipName
                );

                // Remove the trimmed clip
                ffmpeg.FS('unlink', trimmedClipName);
            } else {
                // If speedMultiplier is 1, no need to adjust speed
                adjustedClipName = trimmedClipName;
            }

            // Update the clip name for concatenation
            clipInfo.processedClipName = adjustedClipName;

            // Clean up original clip file
            ffmpeg.FS('unlink', clipName);
        }

        // Create a file list for concatenation
        let concatList = '';
        for (let i = 0; i < timelineClips.length; i++) {
            const adjustedClipName = timelineClips[i].processedClipName;
            concatList += `file '${adjustedClipName}'\n`;
        }
        ffmpeg.FS('writeFile', 'file_list.txt', concatList);

        // Concatenate all clips
        await ffmpeg.run(
            '-f', 'concat',
            '-safe', '0',
            '-i', 'file_list.txt',
            '-c', 'copy',
            'output.mp4'
        );

        // Read the output file
        const data = ffmpeg.FS('readFile', 'output.mp4');

        // Create a Blob and provide a download link
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(videoBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'output.mp4';
        downloadLink.click();

        // Clean up
        ffmpeg.FS('unlink', 'output.mp4');
        ffmpeg.FS('unlink', 'file_list.txt');
        for (let i = 0; i < timelineClips.length; i++) {
            const adjustedClipName = timelineClips[i].processedClipName;
            ffmpeg.FS('unlink', adjustedClipName);
        }

        // Reset export button
        exportButton.textContent = 'Export Video';
        exportButton.style.pointerEvents = 'auto';
    }

    // Function to generate the speed filter based on the speed graph
    async function generateSpeedFilter(clipInfo) {
        // For now, we'll assume a constant speed multiplier
        return 1; // Normal speed
    }
};
async function exportVideo() {
    try {
        // ... [Existing code]
    } catch (error) {
        console.error('Error during export:', error);
        alert('An error occurred during export. Please check the console for details.');
    } finally {
        // Reset export button
        exportButton.textContent = 'Export Video';
        exportButton.style.pointerEvents = 'auto';
    }
}

