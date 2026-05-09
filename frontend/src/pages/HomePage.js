import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Float, Text3D } from '@react-three/drei';
import { FaTint, FaFileInvoiceDollar, FaChartLine, FaShieldAlt, FaMobileAlt, FaCloudUploadAlt } from 'react-icons/fa';
import './HomePage.css';

// 3D Animated Water Drop Component
const AnimatedWaterDrop = () => {
  const meshRef = useRef();
  useFrame((state) => {
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
    meshRef.current.position.y = Math.sin(state.clock.getElapsedTime()) * 0.1;
  });
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.8, 64, 64]} />
        <meshStandardMaterial color="#0d6efd" emissive="#0d6efd" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} transparent opacity={0.9} />
      </mesh>
    </Float>
  );
};

// 3D Floating Particles
const FloatingParticles = () => {
  const count = 200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 15 - 5;
  }
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#4dabf7" size={0.05} transparent opacity={0.6} />
    </points>
  );
};

// Main HomePage Component
const HomePage = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    { icon: <FaFileInvoiceDollar />, title: 'Smart Billing', desc: 'Automated bill calculation based on consumption tiers' },
    { icon: <FaChartLine />, title: 'Real-time Analytics', desc: 'Track usage patterns and revenue insights' },
    { icon: <FaShieldAlt />, title: 'Secure Payments', desc: 'Encrypted transactions with multiple gateways' },
    { icon: <FaMobileAlt />, title: 'Mobile Ready', desc: 'Fully responsive design for all devices' },
    { icon: <FaCloudUploadAlt />, title: 'Cloud Sync', desc: 'Distributed database with Firebase + Neon' },
    { icon: <FaTint />, title: 'Water Conservation', desc: 'Monitor and reduce water wastage' },
  ];

  return (
    <div className="homepage">
      {/* 3D Canvas Background */}
      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4dabf7" />
          <AnimatedWaterDrop />
          <FloatingParticles />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Animated Gradient Overlay */}
      <div className="gradient-overlay"></div>

      {/* SVG Wave Background */}
      <div className="wave-container">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="rgba(13,110,253,0.1)" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* Hero Section */}
      <motion.div className="hero-section" style={{ opacity, scale }}>
        <motion.div className="hero-content" initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1 }}>
          <motion.div className="icon-water" animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
            <FaTint size={70} color="#0d6efd" />
          </motion.div>
          <h1 className="glass-title">
            <span className="highlight">WASCO</span> Water Billing
          </h1>
          <p className="tagline">Distributed Online Water Bill Management System</p>
          <div className="button-group">
            <Link to="/login" className="btn-primary glass-btn">Get Started →</Link>
            <a href="#features" className="btn-outline">Learn More</a>
          </div>
        </motion.div>
      </motion.div>

      {/* Features Section */}
      <section id="features" className="features-section">
        <motion.h2 initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
          Why Choose WASCO?
        </motion.h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card glass-card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, y: -10 }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section with Parallax */}
      <div className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <h3>500+</h3>
            <p>Customers Served</p>
          </div>
          <div className="stat-item">
            <h3>15K+</h3>
            <p>Bills Processed</p>
          </div>
          <div className="stat-item">
            <h3>99.9%</h3>
            <p>Uptime Guarantee</p>
          </div>
          <div className="stat-item">
            <h3>24/7</h3>
            <p>Customer Support</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <motion.div className="cta-section" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
        <div className="cta-content glass-card">
          <h2>Ready to Manage Your Water Bills Efficiently?</h2>
          <p>Join thousands of satisfied customers using WASCO's smart billing platform.</p>
          <Link to="/login" className="btn-primary large">Get Started Now →</Link>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 WASCO Water & Sewerage Company. All rights reserved. | Distributed Database System</p>
      </footer>
    </div>
  );
};

export default HomePage;