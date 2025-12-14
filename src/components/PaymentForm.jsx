import React, { useState, useEffect } from "react";

export default function PaymentForm() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [priceTypes, setPriceTypes] = useState([]);
  const [selectedPriceType, setSelectedPriceType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [toast, setToast] = useState({ message: "", visible: false }); // toast state
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch("/services.json");
        const data = await res.json();

        const allServices = [];
        data.forEach(sub1 => {
          sub1.subCategory.forEach(sub2 => {
            sub2.services.forEach(service => allServices.push(service));
          });
        });

        setServices(allServices);
        if (allServices.length > 0) {
          setSelectedService(allServices[0].serviceName);
          setPriceTypes(allServices[0].prices);
          setSelectedPriceType(allServices[0].prices[0].PriceType);
        }
      } catch (err) {
        console.error("Error fetching services:", err);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const service = services.find(s => s.serviceName === selectedService);
    if (service) {
      setPriceTypes(service.prices);
      setSelectedPriceType(service.prices[0]?.PriceType || "");
    }
  }, [selectedService, services]);

  const showToast = (message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3000); // auto hide after 3s
  };

  const handlePayment = () => setShowModal(true);

  const confirmPayment = async () => {
    if (!selectedService) return showToast("Please select a service");
    if (!userName || !userEmail) return showToast("Please fill all fields");

    setLoading(true);

    try {
      const res = await fetch("http://localhost:4242/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName: selectedService,
          priceType: selectedPriceType,
          userName,
          userEmail,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || "Failed to start payment session.");
      }
    } catch (err) {
      console.error(err);
      showToast("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toast */}
      {toast.visible && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          padding: "15px 25px",
          background: "#ff4d4f",
          color: "#fff",
          fontWeight: 600,
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          zIndex: 9999,
          animation: "fadein 0.3s ease"
        }}>
          {toast.message}
        </div>
      )}

      {/* Pay Now Button */}
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <button
          onClick={handlePayment}
          style={{
            padding: "20px 82px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #1e6af6, #00d4ff, #1e6af6)",
            backgroundSize: "200% 200%",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: "17px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            transition: "all 0.3s ease",
            boxShadow: "0 6px 20px rgba(30, 106, 246, 0.3)",
            animation: "gradientMove 3s ease infinite, pulseGlow 2.5s infinite",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.12)";
            e.currentTarget.style.boxShadow = "0 10px 30px rgba(30, 106, 246, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(30, 106, 246, 0.3)";
          }}
        >
          Pay Now
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              padding: "40px",
              maxWidth: "600px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              boxShadow: "0 15px 50px rgba(0,0,0,0.3)",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            <h2 style={{ color: "#1e6af6", textAlign: "center" }}>Payment Form</h2>

            {/* Service Selector */}
            <label>
              Service:
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #ccc",
                  width: "100%",
                  marginTop: "8px",
                }}
              >
                {services.map((s) => (
                  <option key={s.serviceName} value={s.serviceName}>
                    {s.serviceName}
                  </option>
                ))}
              </select>
            </label>

            {/* User Details */}
            <label>
              Name:
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your Name"
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #ccc",
                  width: "100%",
                  marginTop: "8px",
                }}
              />
            </label>

            <label>
              Email:
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #ccc",
                  width: "100%",
                  marginTop: "8px",
                }}
              />
            </label>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <button
                onClick={confirmPayment}
                style={{
                  padding: "14px 32px",
                  borderRadius: "30px",
                  background: "linear-gradient(135deg, #1e6af6, #00d4ff, #1e6af6)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
                disabled={loading}
              >
                {loading ? (
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      border: "3px solid #ffffffff",
                      borderTop: "3px solid rgba(238, 238, 238, 0.3)",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                ) : (
                  "Proceed to Pay"
                )}
              </button>

              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "14px 32px",
                  borderRadius: "30px",
                  background: "#f0f0f0",
                  color: "#333",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spinner Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
}
