"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

let registered = false;

export function registerGSAP() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, MotionPathPlugin, Flip, useGSAP);
  // High-tension curve: long, loaded wind-up, then a violent release into rest.
  CustomEase.create("tension", "M0,0 C0.84,0 0.06,1 1,1");
  CustomEase.create("snap", "M0,0 C0.19,1 0.22,1 1,1");
  registered = true;
}

registerGSAP();

export { gsap, ScrollTrigger, SplitText, CustomEase, MotionPathPlugin, Flip, useGSAP };
