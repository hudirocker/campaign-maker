import { useState, useRef, useEffect } from "react";
import styles from "../styles/Home.module.css";
import libheif from "libheif-js/wasm-bundle"; 

export default function Home() {
  const canvasRef = useRef(null);
  const [frame, setFrame] = useState("/frame-02.png"); // Frame default
  const [image, setImage] = useState(null); // Gambar yang diunggah
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 }); // Posisi gambar
  const [imageScale, setImageScale] = useState(1); // Skala gambar
  const [dragging, setDragging] = useState(false); // Status drag
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // Posisi awal drag

  const FRAME_WIDTH = 800; // Ukuran frame (4:5)
  const FRAME_HEIGHT = 1000;

  useEffect(() => {
    drawCanvas(); // Render ulang setiap ada perubahan
  }, [image, frame, imageOffset, imageScale]);

    useEffect(() => {
    // Fungsi untuk memuat script eksternal
    const loadHeifScript = () => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/heif@0.4.0/dist/heif.min.js";
      script.async = true;
      script.onload = () => console.log("HEIF.js loaded");
      document.body.appendChild(script);
    };

    loadHeifScript();
  }, []); // Muat script saat komponen pertama kali dirender


const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.type === "image/heic" || file.name.endsWith(".heic")) {
      // Proses file HEIC
      try {
        const buffer = await file.arrayBuffer(); // Membaca file sebagai ArrayBuffer
        const decoder = new libheif.HeifDecoder(); // Inisialisasi decoder
        const data = decoder.decode(buffer); // Dekode file HEIC

        // Ambil gambar pertama dari file HEIC
        const image = data[0];
        const width = image.get_width();
        const height = image.get_height();

        // Buat canvas untuk menggambar ulang gambar
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        const imageData = ctx.createImageData(width, height);

        // Tampilkan data gambar di canvas
        await new Promise((resolve, reject) => {
          image.display(imageData, (displayData) => {
            if (!displayData) {
              return reject(new Error("HEIF processing error"));
            }
            resolve();
          });
        });

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL("image/png"); // Konversi ke PNG

        console.log("Converted HEIC to PNG:", dataUrl);
        // Anda bisa menggunakan `dataUrl` sebagai sumber gambar:
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          const resizedImage = fitImageToFrame(img, FRAME_WIDTH, FRAME_HEIGHT); // Sesuaikan ukuran
          setImage(resizedImage); // Atur state React
          resetImagePosition(); // Reset posisi gambar
        };
      } catch (err) {
        console.error("Error processing HEIC file", err);
        alert("Gagal memproses file HEIC.");
      }
    } else {
      // Proses file non-HEIC seperti biasa
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result;

        img.onload = () => {
          const resizedImage = fitImageToFrame(img, FRAME_WIDTH, FRAME_HEIGHT);
          setImage(resizedImage);
          resetImagePosition(); // Reset posisi gambar
        };
      };
      reader.readAsDataURL(file);
    }
  }
};



    const handleTouchStart = (e) => {
  e.preventDefault(); // Mencegah pull-to-refresh
  if (e.touches.length === 1) {
    setDragging(true);
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  } else if (e.touches.length === 2) {
    const [touch1, touch2] = e.touches;
    const initialDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    setDragStart({ initialDistance });
  }
};


  const handleTouchMove = (e) => {
  e.preventDefault(); // Mencegah zoom browser dan pull-to-refresh
  if (dragging && e.touches.length === 1) {
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    setImageOffset((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  } else if (e.touches.length === 2) {
    const [touch1, touch2] = e.touches;
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    const scaleChange = (currentDistance - dragStart.initialDistance) / 200;
    setImageScale((prev) => Math.max(0.1, prev + scaleChange));
    setDragStart((prev) => ({ ...prev, initialDistance: currentDistance }));
  }
};


  const handleTouchEnd = () => {
    setDragging(false);
  };


  const fitImageToFrame = (img, frameWidth, frameHeight) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Hitung rasio gambar dan frame
    const imgRatio = img.width / img.height;
    const frameRatio = frameWidth / frameHeight;

    // Tentukan dimensi baru gambar agar sesuai frame
    let newWidth, newHeight;
    if (imgRatio > frameRatio) {
      // Gambar lebih lebar dari frame
      newWidth = frameWidth;
      newHeight = frameWidth / imgRatio;
    } else {
      // Gambar lebih tinggi dari frame
      newHeight = frameHeight;
      newWidth = frameHeight * imgRatio;
    }

    // Set ukuran canvas ke dimensi frame
    canvas.width = frameWidth;
    canvas.height = frameHeight;

    // Isi latar belakang dengan putih (opsional)
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, frameWidth, frameHeight);

    // Gambar ulang dengan padding
    const xOffset = (frameWidth - newWidth) / 2;
    const yOffset = (frameHeight - newHeight) / 2;
    ctx.drawImage(img, xOffset, yOffset, newWidth, newHeight);

    return canvas.toDataURL(); // Return hasil sebagai DataURL
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const frameImg = new Image();
    const img = new Image();

    // Bersihkan canvas
    ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

    // Gambar frame untuk masking
    frameImg.src = frame;
    frameImg.onload = () => {
      // Gambar frame di bawah (normal)
      ctx.drawImage(frameImg, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

      // Gambar image jika ada
      if (image) {
        img.src = image;
        img.onload = () => {
          ctx.save();
          ctx.globalCompositeOperation = "destination-in"; // Masking area transparan
          ctx.drawImage(frameImg, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
          ctx.restore();

          // Gambar image di area transparan
          ctx.globalCompositeOperation = "source-over";
          const scaledWidth = img.width * imageScale;
          const scaledHeight = img.height * imageScale;
          ctx.drawImage(
            img,
            imageOffset.x,
            imageOffset.y,
            scaledWidth,
            scaledHeight
          );

          // Gambar frame lagi di atas gambar untuk memastikan border tetap muncul
          ctx.drawImage(frameImg, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        };
      } else {
        // Gambar frame jika belum ada gambar
        ctx.drawImage(frameImg, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      }
    };
  };

  const handleFrameChange = (newFrame) => {
    setFrame(newFrame);
  };

  const handleMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setImageOffset((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const handleWheel = (e) => {
    const scaleChange = e.deltaY > 0 ? -0.1 : 0.1; // Zoom in/out
    setImageScale((prev) => Math.max(0.1, prev + scaleChange)); // Minimal zoom 0.1x
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "15tahunPengabdian.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const resetImagePosition = () => {
    setImageOffset({ x: 0, y: 0 }); // Kembalikan ke posisi tengah
    setImageScale(1); // Reset skala
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Upload Foto, Edit, dan BAGIKAN!!!!</h1>
      {image && (<p>drag dan zoom, untuk menyesuaikan foto dengan frame</p>)}
      <div
  className={styles.canvasContainer}
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseUp}
  onWheel={handleWheel}
  onTouchStart={handleTouchStart} // Handle touch start
  onTouchMove={handleTouchMove}  // Handle touch move
  onTouchEnd={handleTouchEnd}    // Handle touch end
>

        <canvas
          ref={canvasRef}
          width={FRAME_WIDTH}
          height={FRAME_HEIGHT}
          className={styles.canvas}
        ></canvas>
      </div>
      <div className={styles.actions}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className={styles.fileInput}
        />
        {image && (
          <button onClick={resetImagePosition} className={styles.resetButton}>
            Reset
          </button>
        )}
        {image && (<button onClick={handleDownload} className={styles.button}>
          Download
        </button>)}
      </div>
      <div className={styles.frames}>
        <img
          src="/frame-01.png"
          alt="Frame 1"
          className={frame === "/frame-01.png" ? styles.activeFrame : ""}
          onClick={() => handleFrameChange("/frame-01.png")}
        />
        <img
          src="/frame-02.png"
          alt="Frame 2"
          className={frame === "/frame-02.png" ? styles.activeFrame : ""}
          onClick={() => handleFrameChange("/frame-02.png")}
        />
      </div>
      <footer className={styles.footer}>
        <p>Copyright © 2024 hdrck</p>
      </footer>
    </div>
  );
}