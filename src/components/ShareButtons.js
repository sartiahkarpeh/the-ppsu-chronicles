"use client";
import React from "react";
import { FaFacebookF, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";

export default function ShareButtons({ title = "", description = "" }) {
    const [url, setUrl] = React.useState("");

    React.useEffect(() => {
        setUrl(window.location.href);
    }, []);

    const iconStyle = "text-gray-600 hover:scale-110 transition-transform duration-200";
    
    // Create share text with title
    const shareText = title ? `${title} - ` : "";
    const twitterText = title ? `${title}\n\n` : "";
    const emailSubject = title || "Check this out from The PPSU Chronicles";
    const emailBody = description ? `${title}\n\n${description}\n\n` : "";

    return React.createElement(
        "div",
        { className: "flex items-center gap-4" },
        React.createElement(
            "a",
            {
                href: url ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(url)}` : "#",
                target: "_blank",
                rel: "noopener noreferrer",
                className: iconStyle,
                onClick: (e) => { if (!url) e.preventDefault(); }
            },
            React.createElement(FaXTwitter, { size: 22 })
        ),
        React.createElement(
            "a",
            {
                href: url ? `https://www.facebook.com/sharer.php?u=${encodeURIComponent(url)}` : "#",
                target: "_blank",
                rel: "noopener noreferrer",
                className: iconStyle,
                onClick: (e) => { if (!url) e.preventDefault(); }
            },
            React.createElement(FaFacebookF, { size: 22, className: "hover:text-blue-600" })
        ),
        React.createElement(
            "a",
            {
                href: url ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` : "#",
                target: "_blank",
                rel: "noopener noreferrer",
                className: iconStyle,
                onClick: (e) => { if (!url) e.preventDefault(); }
            },
            React.createElement(FaLinkedinIn, { size: 22, className: "hover:text-blue-700" })
        ),
        React.createElement(
            "a",
            {
                href: url ? `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + url)}` : "#",
                target: "_blank",
                rel: "noopener noreferrer",
                className: iconStyle,
                onClick: (e) => { if (!url) e.preventDefault(); }
            },
            React.createElement(FaWhatsapp, { size: 22, className: "hover:text-green-500" })
        ),
        React.createElement(
            "a",
            {
                href: url ? `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody + url)}` : "#",
                className: iconStyle,
                onClick: (e) => { if (!url) e.preventDefault(); }
            },
            React.createElement(MdEmail, { size: 22, className: "hover:text-red-500" })
        )
    );
}
