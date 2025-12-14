import { useState, useEffect } from "react";

/**
 * VisaAmount Component
 * @param {Array} keywords - Array of keywords to match the selected visa type
 */
function VisaAmount({ keywords = ["spouse visa"] }) {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    // Fetch the main JSON file from public folder
    fetch("/all-services.json")
      .then(res => res.json())
      .then(data => {
        // Flatten all sub-services
        const allServices = data.flatMap(service =>
          service.subCategory.flatMap(sub => sub.services)
        );

        // Find service where its keywords match the selected visa type
        const matchedService = allServices.find(s =>
          s.prices?.some(p =>
            p.keywords?.some(kw =>
              keywords.some(userKw =>
                kw.toLowerCase() === userKw.toLowerCase()
              )
            )
          )
        );

        if (matchedService && matchedService.prices) {
          // Use the Inside price as default
          const priceObj = matchedService.prices.find(p => p.PriceType === "Inside");
          if (priceObj) setPrice(priceObj.PriceAmount);
        }
      })
      .catch(err => console.error("Error loading service data:", err));
  }, [keywords]);

  return (
    <h3 style={{
      marginBottom: "16px",
      color: "#1e6af6",
      fontWeight: 700,
      fontSize: "20px",
    }}>
      Visa Amount: <span style={{ color: "#eb6b02" }}>{price ? `AED ${price}` : "-"}</span>
    </h3>
  );
}

export default VisaAmount;
