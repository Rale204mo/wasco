import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { FaTint, FaFileInvoiceDollar, FaChartLine, FaShieldAlt, FaMobileAlt, FaCloudUploadAlt } from 'react-icons/fa';
import './HomePage.css';

const HomePage = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    // 3D Water Drop Scene
    const scene = new THREE.Scene();
    scene.background = null;
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    canvasRef.current.appendChild(renderer.domElement);

    // Water drop sphere
    const geometry = new THREE.SphereGeometry(0.8, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0x0d6efd,
      emissive: 0x0a4f9e,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    });
    const waterDrop = new THREE.Mesh(geometry, material);
    scene.add(waterDrop);

    // Floating particles
    const particleCount = 150;
    const particles = [];
    const particleGeometry = new THREE.SphereGeometry(0.03, 6, 6);
    for (let i = 0; i < particleCount; i++) {
      const particleMat = new THREE.MeshStandardMaterial({ color: 0x4dabf7 });
      const particle = new THREE.Mesh(particleGeometry, particleMat);
      particle.position.x = (Math.random() - 0.5) * 12;
      particle.position.y = (Math.random() - 0.5) * 8;
      particle.position.z = (Math.random() - 0.5) * 10 - 2;
      scene.add(particle);
      particles.push(particle);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);
    const backLight = new THREE.PointLight(0x0d6efd, 0.5);
    backLight.position.set(-2, 1, -3);
    scene.add(backLight);

    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.01;
      waterDrop.rotation.y = time * 0.3;
      waterDrop.rotation.x = Math.sin(time * 0.2) * 0.2;
      waterDrop.position.y = Math.sin(time) * 0.1;
      particles.forEach((p, idx) => {
        p.position.x += Math.sin(time + idx) * 0.002;
        p.position.y += Math.cos(time + idx) * 0.002;
      });
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvasRef.current && renderer.domElement) {
        canvasRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const features = [
    { icon: <FaFileInvoiceDollar />, title: 'Smart Billing', desc: 'Automatic bill calculation based on consumption' },
    { icon: <FaChartLine />, title: 'Real‑time Analytics', desc: 'Monitor usage and revenue' },
    { icon: <FaShieldAlt />, title: 'Secure Payments', desc: 'Encrypted transactions' },
    { icon: <FaMobileAlt />, title: 'Mobile Ready', desc: 'Fully responsive' },
    { icon: <FaCloudUploadAlt />, title: 'Cloud Sync', desc: 'Firebase + Neon distributed DB' },
    { icon: <FaTint />, title: 'Water Conservation', desc: 'Track and reduce wastage' },
  ];

  return (
    <div className="homepage">
      <div ref={canvasRef} className="three-canvas"></div>
      <div className="gradient-overlay"></div>
      <div className="wave-bottom">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="rgba(13,110,253,0.15)" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>

      <div className="hero-section">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            className="icon-water"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <FaTint size={70} color="#0d6efd" />
          </motion.div>
          <h1 className="title">WASCO Water Billing</h1>
          <p className="subtitle">Distributed Online Water Bill Management System</p>
          <div className="button-group">
            <Link to="/login" className="btn-primary">Get Started →</Link>
          </div>
        </motion.div>
      </div>

      <section className="features-section">
        <h2>Why Choose WASCO?</h2>
        <div className="features-grid">
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="feature-card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05, y: -10 }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <p>© 2025 WASCO Water & Sewerage Company – Distributed Database System</p>
      </footer>
    </div>
  );
};

export default HomePage;