import React, { createContext, useContext, useState, useCallback } from 'react';

const WalkthroughContext = createContext({});

export const useWalkthrough = () => useContext(WalkthroughContext);

export const WalkthroughProvider = ({ children }) => {
    const [targets, setTargets] = useState({});
    const [targetRefs, setTargetRefs] = useState({}); // Store refs
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [steps, setSteps] = useState([]);

    // Function for components to register their layout
    const registerTarget = useCallback((id, layout) => {
        setTargets(prev => {
            if (JSON.stringify(prev[id]) === JSON.stringify(layout)) return prev;
            return {
                ...prev,
                [id]: layout
            };
        });
    }, []);

    const registerTargetRef = useCallback((id, ref) => {
        setTargetRefs(prev => ({ ...prev, [id]: ref }));
    }, []);

    const reMeasureTarget = useCallback((id) => {
        const ref = targetRefs[id];
        if (ref && ref.measure) {
            ref.measure((x, y, width, height, pageX, pageY) => {
                registerTarget(id, { x: pageX, y: pageY, width, height });
            });
        }
    }, [targetRefs, registerTarget]);

    const unregisterTarget = useCallback((id) => {
        setTargets(prev => {
            const newTargets = { ...prev };
            delete newTargets[id];
            return newTargets;
        });
    }, []);

    const startWalkthrough = (newSteps) => {
        setSteps(newSteps);
        setCurrentStepIndex(0);
        setIsOpen(true);
    };

    const nextStep = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            finishWalkthrough();
        }
    };

    const prevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    const finishWalkthrough = () => {
        setIsOpen(false);
        // Reset after animation could be better but this is fine
        setTimeout(() => {
            setCurrentStepIndex(0);
            setSteps([]);
        }, 300);
    };

    return (
        <WalkthroughContext.Provider value={{
            targets,
            targetRefs, // Export refs
            registerTarget,
            registerTargetRef,
            reMeasureTarget,
            unregisterTarget,
            isOpen,
            currentStep: steps[currentStepIndex],
            currentStepIndex,
            totalSteps: steps.length,
            startWalkthrough,
            nextStep,
            prevStep,
            finishWalkthrough,
            setIsOpen
        }}>
            {children}
        </WalkthroughContext.Provider>
    );
};
