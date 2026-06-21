/* =========================================================
   ShutterSound — script.js
   Full-width justified gallery with no gaps.
   Each row is built separately and its pixel widths always add
   up to the exact gallery width. Missing images are removed.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     SETTINGS
     --------------------------------------------------------- */
  var PHOTO_COUNT = 50;
  var PHOTO_FOLDER = "images";
  var PHOTO_EXT = "jpg";

  // Smaller values put more photos in each row.
  var TARGET_ROW_HEIGHT = 380;
  var TARGET_ROW_HEIGHT_TABLET = 250;
  var TARGET_ROW_HEIGHT_MOBILE = 165;

  /* ---------------------------------------------------------
     Elements and state
     --------------------------------------------------------- */
  var gallery = document.getElementById("gallery");
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxClose = document.getElementById("lightbox-close");
  var lightboxPrev = document.getElementById("lightbox-prev");
  var lightboxNext = document.getElementById("lightbox-next");

  var allPhotos = [];
  var photos = [];
  var currentIndex = 0;
  var layoutTimer = null;
  var resizeTimer = null;

  /* ---------------------------------------------------------
     Build photo elements
     --------------------------------------------------------- */
  function buildGallery() {
    for (var i = 1; i <= PHOTO_COUNT; i++) {
      createPhoto(i);
    }

    // Put every image into a row immediately. Images that have not
    // loaded yet temporarily use a square ratio, then the rows update.
    layoutGallery();
  }

  function createPhoto(index) {
    var src = PHOTO_FOLDER + "/" + index + "." + PHOTO_EXT;

    var item = document.createElement("a");
    item.href = src;
    item.className = "photo";
    item.setAttribute("aria-label", "Open portfolio photo " + index);

    var img = document.createElement("img");
    img.src = src;
    img.alt = "Portfolio photo " + index;
    img.decoding = "async";
    img.loading = index <= 8 ? "eager" : "lazy";

    var record = {
      index: index,
      src: src,
      ratio: 1,
      failed: false,
      el: item,
      img: img
    };

    allPhotos.push(record);

    img.addEventListener("load", function () {
      if (img.naturalWidth && img.naturalHeight) {
        record.ratio = img.naturalWidth / img.naturalHeight;
      }
      scheduleLayout();
    });

    img.addEventListener("error", function () {
      // A missing number such as images/17.jpg should not leave
      // an empty box in the gallery.
      record.failed = true;
      item.remove();
      scheduleLayout();
    });

    item.addEventListener("click", function (event) {
      event.preventDefault();
      openLightbox(record);
    });

    item.appendChild(img);
  }

  /* ---------------------------------------------------------
     Full-width justified layout
     --------------------------------------------------------- */
  function getTargetRowHeight() {
    var width = window.innerWidth;
    if (width <= 600) return TARGET_ROW_HEIGHT_MOBILE;
    if (width <= 900) return TARGET_ROW_HEIGHT_TABLET;
    return TARGET_ROW_HEIGHT;
  }

  function layoutGallery() {
    var containerWidth = gallery.clientWidth;
    if (!containerWidth) return;

    photos = allPhotos.filter(function (photo) {
      return !photo.failed;
    });

    gallery.replaceChildren();

    if (!photos.length) return;

    var targetHeight = getTargetRowHeight();
    var maxRowHeight = targetHeight * 1.35;
    var row = [];
    var rowAspectSum = 0;

    for (var i = 0; i < photos.length; i++) {
      row.push(photos[i]);
      rowAspectSum += photos[i].ratio;

      if (rowAspectSum * targetHeight >= containerWidth) {
        appendRow(row, containerWidth / rowAspectSum, containerWidth);
        row = [];
        rowAspectSum = 0;
      }
    }

    // The final row is also forced to the exact same width.
    // Its height is capped so one or two remaining photos do not
    // become enormous. object-fit: cover handles the small crop.
    if (row.length) {
      appendRow(
        row,
        Math.min(containerWidth / rowAspectSum, maxRowHeight),
        containerWidth
      );
    }
  }

  function appendRow(row, rowHeight, containerWidth) {
    var rowElement = document.createElement("div");
    rowElement.className = "gallery-row";
    rowElement.style.height = Math.max(1, Math.round(rowHeight)) + "px";

    var aspectSum = 0;
    var exactWidths = [];
    var widths = [];
    var usedWidth = 0;
    var i;

    for (i = 0; i < row.length; i++) {
      aspectSum += row[i].ratio;
    }

    // First round every width down.
    for (i = 0; i < row.length; i++) {
      var exactWidth = (row[i].ratio / aspectSum) * containerWidth;
      exactWidths.push(exactWidth);
      widths.push(Math.floor(exactWidth));
      usedWidth += Math.floor(exactWidth);
    }

    // Give the leftover pixels to the photos with the largest decimal
    // remainders. The final total is always exactly containerWidth.
    var pixelsLeft = containerWidth - usedWidth;
    var remainderOrder = exactWidths
      .map(function (width, index) {
        return { index: index, remainder: width - Math.floor(width) };
      })
      .sort(function (a, b) {
        return b.remainder - a.remainder;
      });

    for (i = 0; i < pixelsLeft; i++) {
      widths[remainderOrder[i % remainderOrder.length].index] += 1;
    }

    for (i = 0; i < row.length; i++) {
      var photo = row[i];
      var width = widths[i];

      photo.el.style.width = width + "px";
      photo.el.style.height = "100%";
      photo.el.style.flex = "0 0 " + width + "px";
      rowElement.appendChild(photo.el);
    }

    gallery.appendChild(rowElement);
  }

  function scheduleLayout() {
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(layoutGallery, 40);
  }

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutGallery, 120);
  });

  // ResizeObserver catches phone rotation and other width changes more
  // reliably than the window resize event alone.
  if ("ResizeObserver" in window) {
    new ResizeObserver(scheduleLayout).observe(gallery);
  }

  /* ---------------------------------------------------------
     Lightbox
     --------------------------------------------------------- */
  function openLightbox(record) {
    currentIndex = photos.indexOf(record);
    if (currentIndex < 0) return;

    updateLightboxImage();
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function updateLightboxImage() {
    var photo = photos[currentIndex];
    if (!photo) return;

    lightboxImg.src = photo.src;
    lightboxImg.alt = "Portfolio photo " + photo.index;
  }

  function showPrev() {
    if (!photos.length) return;
    currentIndex = (currentIndex - 1 + photos.length) % photos.length;
    updateLightboxImage();
  }

  function showNext() {
    if (!photos.length) return;
    currentIndex = (currentIndex + 1) % photos.length;
    updateLightboxImage();
  }

  lightboxClose.addEventListener("click", closeLightbox);

  lightboxPrev.addEventListener("click", function (event) {
    event.stopPropagation();
    showPrev();
  });

  lightboxNext.addEventListener("click", function (event) {
    event.stopPropagation();
    showNext();
  });

  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", function (event) {
    if (!lightbox.classList.contains("open")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showPrev();
    if (event.key === "ArrowRight") showNext();
  });

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  lightbox.setAttribute("aria-hidden", "true");
  buildGallery();
  window.addEventListener("load", layoutGallery);
})();
