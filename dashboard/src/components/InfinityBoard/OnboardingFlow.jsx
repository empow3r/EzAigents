import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useInfinityBoardStore } from '../../stores/infinityBoardStore';

const OnboardingFlow = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    northStar: '',
    vision: '',
    goals: [],
    theme: 'futurist'
  });

  const { completeOnboarding, setTheme } = useInfinityBoardStore();

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to InfinityBoard',
      subtitle: 'Your legendary life starts here',
      icon:Icons.Sparkles,
      component: WelcomeStep
    },
    {
      id: 'identity',
      title: "What's your name?",
      subtitle: 'Let us personalize your experience',
      icon:Icons.Target,
      component: IdentityStep
    },
    {
      id: 'northstar',
      title: "What's your North Star?",
      subtitle: 'Your ultimate vision and purpose',
      icon:Icons.Brain,
      component: NorthStarStep
    },
    {
      id: 'goals',
      title: 'Set your initial goals',
      subtitle: 'What do you want to accomplish?',
      icon:Icons.Target,
      component: GoalsStep
    },
    {
      id: 'theme',
      title: 'Choose your universe',
      subtitle: 'Select your visual experience',
      icon:Icons.Rocket,
      component: ThemeStep
    }
  ];

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      // Complete onboarding
      completeOnboarding(formData);
      setTheme(formData.theme);
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (data) => {
    setFormData({ ...formData, ...data });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
    >
      {/* Animated background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 20% 20%, #3B82F6 0%, transparent 50%)',
              'radial-gradient(circle at 80% 80%, #8B5CF6 0%, transparent 50%)',
              'radial-gradient(circle at 50% 50%, #EC4899 0%, transparent 50%)',
              'radial-gradient(circle at 20% 20%, #3B82F6 0%, transparent 50%)',
            ]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute inset-0 opacity-30"
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-6">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-white/60 text-sm">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-full rounded-full"
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center"
              >
                <currentStepData.icon className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-2">{currentStepData.title}</h1>
              <p className="text-white/60 text-lg">{currentStepData.subtitle}</p>
            </div>

            {/* Step content */}
            <currentStepData.component 
              formData={formData} 
              updateFormData={updateFormData}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  isFirstStep 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Icons.ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:scale-105 transition-transform font-semibold"
              >
                <span>{isLastStep ? 'Complete Setup' : 'Continue'}</span>
                <Icons.ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Step Components
function WelcomeStep() {
  return (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-white mb-4">
          Design Your Legendary Life
        </h2>
        <p className="text-white/80 text-lg leading-relaxed">
          InfinityBoard is your personal command center for building an extraordinary life. 
          Manage your business empire, optimize your health, grow your wealth, and nurture 
          relationships—all in one beautiful, AI-powered interface.
        </p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6"
      >
        {['🧠', '💼', '💪', '💰'].map((emoji, i) => (
          <div key={i} className="aspect-square bg-white/5 rounded-xl flex items-center justify-center text-4xl">
            {emoji}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function IdentityStep({ formData, updateFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Your name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="Enter your name"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-colors"
          autoFocus
        />
      </div>
      
      <p className="text-white/60 text-center">
        We'll use this to personalize your experience and daily greetings.
      </p>
    </div>
  );
}

function NorthStarStep({ formData, updateFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Your North Star
        </label>
        <textarea
          value={formData.northStar}
          onChange={(e) => updateFormData({ northStar: e.target.value })}
          placeholder="What's your ultimate vision? What legacy do you want to create?"
          rows={4}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-colors resize-none"
        />
      </div>
      
      <div className="bg-white/5 rounded-xl p-4">
        <h4 className="text-white font-medium mb-2">Examples:</h4>
        <ul className="text-white/60 text-sm space-y-1">
          <li>• "Build a billion-dollar company that changes the world"</li>
          <li>• "Create financial freedom for my family"</li>
          <li>• "Become the best version of myself and inspire others"</li>
        </ul>
      </div>
    </div>
  );
}

function GoalsStep({ formData, updateFormData }) {
  const [goalInput, setGoalInput] = useState('');
  
  const addGoal = () => {
    if (goalInput.trim()) {
      updateFormData({ goals: [...formData.goals, goalInput.trim()] });
      setGoalInput('');
    }
  };

  const removeGoal = (index) => {
    updateFormData({ 
      goals: formData.goals.filter((_, i) => i !== index) 
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Add your initial goals
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addGoal()}
            placeholder="Enter a goal and press Enter"
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-colors"
          />
          <button
            onClick={addGoal}
            className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {formData.goals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-white/80 text-sm font-medium">Your Goals:</h4>
          {formData.goals.map((goal, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
            >
              <span className="text-white">{goal}</span>
              <button
                onClick={() => removeGoal(index)}
                className="text-white/40 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeStep({ formData, updateFormData }) {
  const themes = [
    {
      id: 'luxe',
      name: 'Ultra Luxe',
      description: 'Jet, yacht, high-rise vibes',
      icon: '⚡',
      gradient: 'from-yellow-400 to-orange-500'
    },
    {
      id: 'zen',
      name: 'Zen Minimal',
      description: 'Temple, forest, candles',
      icon: '🌿',
      gradient: 'from-green-400 to-teal-500'
    },
    {
      id: 'futurist',
      name: 'Futurist',
      description: 'Space station, digital grid',
      icon: '🚀',
      gradient: 'from-purple-400 to-pink-500'
    }
  ];

  return (
    <div className="space-y-6">
      <p className="text-white/80 text-center">
        Choose the aesthetic that resonates with your vision
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <motion.button
            key={theme.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => updateFormData({ theme: theme.id })}
            className={`p-6 rounded-xl border-2 transition-all ${
              formData.theme === theme.id
                ? 'border-white/50 bg-white/20'
                : 'border-white/20 bg-white/5 hover:border-white/30'
            }`}
          >
            <div className={`text-4xl mb-3 w-16 h-16 mx-auto rounded-xl bg-gradient-to-r ${theme.gradient} flex items-center justify-center`}>
              {theme.icon}
            </div>
            <h3 className="text-white font-semibold mb-1">{theme.name}</h3>
            <p className="text-white/60 text-sm">{theme.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default OnboardingFlow;