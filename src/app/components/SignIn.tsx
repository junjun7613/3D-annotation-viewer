"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, provider } from "@/lib/firebase/firebase";
import { signInWithPopup, signOut } from "firebase/auth";

export const SighIn = () => {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    if (user) {
        console.log(user);
        setIsSignedIn(true);
    } else {
        console.log(user);
        setIsSignedIn(false);
    }
  }, [user]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
      setIsSignedIn(true);
      router.push("/");
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const signOutWithGoogle = async () => {
    try {
      await signOut(auth);
      setIsSignedIn(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <>
      {isSignedIn ? (
        <button
          onClick={signOutWithGoogle}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow"
        >
          ログアウト
        </button>
      ) : (
        <button
          onClick={signInWithGoogle}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow"
        >
          ログインして利用
        </button>
      )}
    </>
  );
};

export default SighIn;