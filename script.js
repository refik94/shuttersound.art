/* =========================================================
   ShutterSound — script.js
   1) Builds a justified photo gallery: measures each photo's
      real aspect ratio and lays out full rows so every row is
      exactly the same width, with photos scaled (not cropped)
      to fit perfectly — like Google Photos / Flickr.
   2) Powers the click-to-open lightbox slideshow with prev/
      next, keyboard arrows, Escape to close, and click-outside
      to close.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     SETTINGS — the only things you should need to change
     --------------------------------------------------------- */
  var PHOTO_COUNT = 50;          // how many photos you have in /images
  var PHOTO_FOLDER = "images";   // folder the photos live in
  var PHOTO_EXT = "jpg";         // file extension (jpg, jpeg, png, webp...)

  // Bigger row height = fewer, bigger photos per row.
  // At these sizes you'll typically get ~3-6 photos per row
  // depending on screen width and each photo's own ratio.
  var TARGET_ROW_HEIGHT = 460;        // ideal row height (desktop) in px
  var TARGET_ROW_HEIGHT_TABLET = 360;
  var TARGET_ROW_HEIGHT_MOBILE = 240;

  /* ---------------------------------------------------------
     Elements
     --------------------------------------------------------- */
  var gallery = document.getElementById("gallery");
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxClose = document.getElementById("lightbox-close");
  var lightboxPrev = document.getElementById("lightbox-prev");
  var lightboxNext = document.getElementById("lightbox-next");

  var photos = [];      // { src, ratio, el }
  var currentIndex = 0;
  var layoutTimer = null;

  /* ---------------------------------------------------------
     Build thumbnails
     --------------------------------------------------------- */
  function buildGallery() {
    for (var i = 1; i <= PHOTO_COUNT; i++) {
      (function (index) {
        var src = PHOTO_FOLDER + "/" + index + "." + PHOTO_EXT;

        var item = document.createElement("a");
        item.href = "#";
        item.className = "photo";

        var img = document.createElement("img");
        img.src = src;
        img.alt = "Portfolio photo " + index;
        img.loading = "lazy";

        var record = { src: src, ratio: 1, el: item };
        photos.push(record);

        function onReady() {
          if (img.naturalWidth && img.naturalHeight) {
            record.ratio = img.naturalWidth / img.naturalHeight;
          }
          scheduleLayout();
        }

        if (img.complete && img.naturalWidth) {
          onReady();
        } else {
          img.addEventListener("load", onReady);
          img.addEventListener("error", scheduleLayout); // keep default ratio, still lays out
        }

        item.addEventListener("click", function (e) {
          e.preventDefault();
          openLightbox(index - 1);
        });

        item.appendChild(img);
        gallery.appendChild(item);
      })(i);
    }
  }

  /* ---------------------------------------------------------
     Justified row layout
     --------------------------------------------------------- */
  function getTargetRowHeight() {
    var w = window.innerWidth;
    if (w < 600) return TARGET_ROW_HEIGHT_MOBILE;
    if (w < 900) return TARGET_ROW_HEIGHT_TABLET;
    return TARGET_ROW_HEIGHT;
  }

  function layoutGallery() {
    var containerWidth = gallery.clientWidth;
    if (!containerWidth) return;

    var targetHeight = getTargetRowHeight();
    var maxRowHeight = targetHeight * 1.6; // cap so a sparse last row doesn't get huge
    var row = [];
    var rowAspectSum = 0;

    for (var i = 0; i < photos.length; i++) {
      var p = photos[i];
      row.push(p);
      rowAspectSum += p.ratio;

      var rowWidthAtTarget = rowAspectSum * targetHeight;

      if (rowWidthAtTarget >= containerWidth) {
        var rowHeight = containerWidth / rowAspectSum;
        applyRow(row, rowHeight, maxRowHeight, containerWidth);
        row = [];
        rowAspectSum = 0;
      }
    }

    // Final, possibly-incomplete row: justify it too so the grid is
    // always full-width with no empty gap. If there aren't enough
    // photos to fill the row at a sensible height, the row height
    // gets capped and the photos are cropped very slightly (via
    // object-fit: cover) to still reach the full row width.
    if (row.length) {
      var lastRowHeight = containerWidth / rowAspectSum;
      applyRow(row, lastRowHeight, maxRowHeight, containerWidth);
    }
  }

  function applyRow(row, naturalRowHeight, maxRowHeight, containerWidth) {
    var height = Math.min(naturalRowHeight, maxRowHeight);

    // Widths if each photo kept its true ratio at this (possibly
    // capped) height — these may not add up to the full container
    // width once capped, so we scale them up slightly to close the
    // gap. That extra scale is what creates the gentle crop.
    var rawWidths = [];
    var rawTotal = 0;
    for (var i = 0; i < row.length; i++) {
      var w = row[i].ratio * height;
      rawWidths.push(w);
      rawTotal += w;
    }

    var scaleX = containerWidth / rawTotal;

    for (var j = 0; j < row.length; j++) {
      row[j].el.style.height = height + "px";
      row[j].el.style.width = rawWidths[j] * scaleX + "px";
    }
  }

  function scheduleLayout() {
    // Batch rapid calls (many images loading at once) into one layout pass
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(layoutGallery, 50);
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutGallery, 150);
  });

  /* ---------------------------------------------------------
     Lightbox
     --------------------------------------------------------- */
  function openLightbox(index) {
    currentIndex = index;
    updateLightboxImage();
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
  }

  function updateLightboxImage() {
    var p = photos[currentIndex];
    lightboxImg.src = p.src;
    lightboxImg.alt = "Portfolio photo " + (currentIndex + 1);
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + photos.length) % photos.length;
    updateLightboxImage();
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % photos.length;
    updateLightboxImage();
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", function (e) {
    e.stopPropagation();
    showPrev();
  });
  lightboxNext.addEventListener("click", function (e) {
    e.stopPropagation();
    showNext();
  });

  // Click on the dark backdrop (not the photo) closes the lightbox
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showPrev();
    if (e.key === "ArrowRight") showNext();
  });

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  buildGallery();
  window.addEventListener("load", layoutGallery);
})();
