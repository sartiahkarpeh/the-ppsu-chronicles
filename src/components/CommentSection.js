"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase/config";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

export default function CommentSection({ storyId }) {
  const [comments, setComments] = useState([]);
  const [authorName, setAuthorName] = useState("");
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentsRef = useMemo(() => {
    if (!storyId) return null;
    return collection(db, "posts", String(storyId), "comments");
  }, [storyId]);

  useEffect(() => {
    if (!commentsRef) return;
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const next = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          author: data.author || "Anonymous",
          text: data.text || "",
          createdAt: data.createdAt?.toDate?.() || null,
        };
      });
      setComments(next);
    });
    return () => unsubscribe();
  }, [commentsRef]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!commentsRef) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await addDoc(commentsRef, {
        author: authorName.trim() || "Anonymous",
        text: trimmed,
        createdAt: serverTimestamp(),
      });
      setText("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Comments</h2>
      <div className="bg-gray-100 p-6 rounded-lg">
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name (optional)"
              className="md:col-span-2 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              aria-label="Your name"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="md:col-span-4 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              rows="3"
              placeholder="Write a comment..."
              aria-label="Comment text"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !text.trim()}
            className="mt-3 bg-primary disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </button>
        </form>

        <div className="space-y-6">
          {comments.length === 0 && (
            <p className="text-sm text-gray-500">Be the first to comment.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex space-x-4">
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-700">
                {(c.author || "A").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="font-bold">{c.author || "Anonymous"}</p>
                <p className="text-xs text-text-secondary mb-1">
                  {c.createdAt ? c.createdAt.toLocaleString() : "Just now"}
                </p>
                <p className="text-text-primary whitespace-pre-wrap">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}