import { HiCheck } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import React from "react";

export type WizardStep = {
  id: string;
  name: string;
};

type WizardNavProps = {
  steps: WizardStep[];
  currentStep: string;
  onChange: (stepId: string) => void;
};

export default function WizardNav({
  steps,
  currentStep,
  onChange,
}: WizardNavProps) {
  return (
    <nav aria-label="Progress">
      <ol
        role="list"
        className="divide-y divide-gray-300 rounded-md border border-gray-300 md:flex md:divide-y-0"
      >
        {steps.map((step, stepIdx) => {
          const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
          let status: "complete" | "current" | "upcoming";

          if (stepIdx < currentStepIndex) {
            status = "complete";
          } else if (stepIdx === currentStepIndex) {
            status = "current";
          } else {
            status = "upcoming";
          }

          return (
            <StepItem
              key={step.name}
              step={step}
              status={status}
              onChange={onChange}
              isLastStep={stepIdx === steps.length - 1}
            />
          );
        })}
      </ol>
    </nav>
  );
}

type StepItemProps = {
  step: WizardStep;
  status: "complete" | "current" | "upcoming";
  onChange: (stepId: string) => void;
  isLastStep: boolean;
};

function StepItem({ step, status, onChange, isLastStep }: StepItemProps) {
  let buttonClass = "group flex items-center my-4 w-full hover:bg-transparent ";
  let circleClass =
    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ";
  let textClass = "ml-4 text-sm font-medium ";
  let liClass = "relative md:flex md:flex-1";
  let circleTextClass = "text-slate-900";

  if (status === "complete") {
    buttonClass += "";
    circleClass += "bg-slate-900 group-hover:bg-slate-800";
    textClass += "text-gray-900";
  } else if (status === "current") {
    // liClass += " bg-slate-100";
    buttonClass += "px-6 py-4";
    circleClass += "border-2 border-slate-800 bg-slate-300";
    textClass += "text-slate-900";
    // circleTextClass = "text-white";
  } else {
    circleClass += "border-2 border-gray-300 group-hover:border-gray-400";
    textClass += "text-gray-500 group-hover:text-gray-900";
  }

  return (
    <li className={liClass}>
      <Button
        onClick={() => onChange(step.id)}
        className={buttonClass}
        variant="ghost"
        {...(status === "current" ? { "aria-current": "step" } : {})}
      >
        <span className="flex items-center px-6 py-4 text-sm font-medium">
          <span className={circleClass}>
            {status === "complete" ? (
              <HiCheck aria-hidden="true" className="h-6 w-6 text-white" />
            ) : (
              <span className={circleTextClass}>{step.id}</span>
            )}
          </span>
          <span className={textClass}>{step.name}</span>
        </span>
      </Button>
      {!isLastStep && <ArrowSeparator />}
    </li>
  );
}

function ArrowSeparator() {
  return (
    <div
      aria-hidden="true"
      className="absolute right-0 top-0 hidden h-full w-5 md:block"
    >
      <svg
        fill="none"
        viewBox="0 0 22 80"
        preserveAspectRatio="none"
        className="h-full w-full text-gray-300"
      >
        <path
          d="M0 -2L20 40L0 82"
          stroke="currentcolor"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
