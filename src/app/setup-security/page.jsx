"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const SECURITY_QUESTIONS = [
  "What is a specific childhood memory that stands out to you?",
  "What was the name of your first childhood friend?",
  "What is your oldest sibling's middle name?",
  "What street did you live on when you were 10 years old?",
  "What was your childhood nickname that only family used?"
];

export default function SetupSecurityPage() {
  const [selectedQuestions, setSelectedQuestions] = useState([
    { question: '', answer: '' },
    { question: '', answer: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleQuestionChange = (index, question) => {
    const updated = [...selectedQuestions];
    updated[index].question = question;
    setSelectedQuestions(updated);
  };

  const handleAnswerChange = (index, answer) => {
    const updated = [...selectedQuestions];
    updated[index].answer = answer;
    setSelectedQuestions(updated);
  };

  const addQuestion = () => {
    if (selectedQuestions.length < 3) {
      setSelectedQuestions([...selectedQuestions, { question: '', answer: '' }]);
    }
  };

  const removeQuestion = (index) => {
    if (selectedQuestions.length > 2) {
      const updated = selectedQuestions.filter((_, i) => i !== index);
      setSelectedQuestions(updated);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate questions
    for (const q of selectedQuestions) {
      if (!q.question || !q.answer) {
        setError('Please select questions and provide answers for all fields');
        setLoading(false);
        return;
      }

      if (q.answer.length < 8) {
        setError('Answers must be at least 8 characters long');
        setLoading(false);
        return;
      }
    }

    // Check for duplicate questions
    const questions = selectedQuestions.map(q => q.question);
    if (new Set(questions).size !== questions.length) {
      setError('Please select different questions');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/security-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: selectedQuestions }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Security questions set successfully!');
        setTimeout(() => window.location.href = '/forums', 2000);
      } else {
        setError(data.error || 'Failed to set security questions');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set Up Security Questions
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please set at least 2 security questions to secure your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardContent className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {selectedQuestions.map((q, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">
                      Security Question {index + 1}
                    </Label>
                    {selectedQuestions.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <select
                    value={q.question}
                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a question...</option>
                    {SECURITY_QUESTIONS.map((question) => (
                      <option 
                        key={question} 
                        value={question}
                        disabled={selectedQuestions.some((sq, i) => i !== index && sq.question === question)}
                      >
                        {question}
                      </option>
                    ))}
                  </select>
                  
                  <Input
                    type="text"
                    placeholder="Your answer (minimum 8 characters)"
                    value={q.answer}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              ))}

              {selectedQuestions.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addQuestion}
                  className="w-full"
                >
                  Add Another Question
                </Button>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Setting up...' : 'Set Security Questions'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}