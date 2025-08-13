import React from "react";
import { FaFacebookF, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";

export default function ShareButtons({ title }) {
    const url = typeof window !== "undefined" ? window.location.href : "";

    const iconStyle = "text-gray-600 hover:scale-110 transition-transform duration-200";

    return React.createElement(
        "div",
        { className: "flex items-center gap-4" },
        React.createElement(
            "a",
            {
                href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${url}`,
                target: "_blank",
                rel: "noopener noreferrer",
                className: iconStyle
            },
            React.createElement(FaXTwitter, { size: 22 })
        ),
        React.createElement(
            "a",
            {
                href: `https://facebook.com/sharer/sharer.php?u=${url}`,
                target: "_blank",
                rel: "noopener noreferrer",
                className: iconStyle
            },
            React.createElement(FaFacebookF, { size: 22, className: "hover:text-blue-600" })
        ),
        React.createElement(
            "a",
            {
                href: `https://linkedin.com/shareArticle?mini=true&url=${url}`,
                target: "_blank",
                rel: "noopener noreferrer",
                className: iconStyle
            },
            React.createElement(FaLinkedinIn, { size: 22, className: "hover:text-blue-700" })
        ),
        React.createElement(
            "a",
            {
                href: `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`,
                target: "_blank",
                rel: "noopener noreferrer",
                className: iconStyle
            },
            React.createElement(FaWhatsapp, { size: 22, className: "hover:text-green-500" })
        ),
        React.createElement(
            "a",
            {
                href: `mailto:?subject=${encodeURIComponent(title)}&body=${url}`,
                className: iconStyle
            },
            React.createElement(MdEmail, { size: 22, className: "hover:text-red-500" })
        )
    );
}
