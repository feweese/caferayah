"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MainLayout } from "@/components/layout/main-layout";
import { Icons } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  subject: z.string().min(2, { message: "Subject must be at least 2 characters" }),
  message: z.string().min(10, { message: "Message must be at least 10 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    success: boolean;
    message: string;
    emailSent?: boolean;
    savedToFile?: boolean;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setSubmitStatus(null);

    try {
      // Send form data to API endpoint
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }
      
      // Store submit status
      setSubmitStatus({
        success: true,
        message: data.message,
        emailSent: data.emailSent,
        savedToFile: data.savedToFile
      });
      
      // Show success message
      toast.success(data.message || "Message sent successfully! We'll get back to you soon.");
      form.reset();
    } catch (error) {
      console.error('Error sending message:', error);
      setSubmitStatus({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send message. Please try again."
      });
      toast.error(error instanceof Error ? error.message : "Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="container py-16 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-3xl font-bold mb-2">Contact Caférayah</h1>
          <p className="text-muted-foreground text-center max-w-2xl">
            We'd love to hear from you! Reach out with any questions, feedback, or inquiries.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="bg-card border rounded-lg p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
              
              {submitStatus?.success && (
                <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
                  <Icons.checkCircle className="h-5 w-5" />
                  <AlertTitle>Message Sent!</AlertTitle>
                  <AlertDescription>
                    {submitStatus.message}
                    {submitStatus.emailSent && submitStatus.savedToFile && (
                      <p className="text-sm mt-1">Your message was sent via email and saved as a backup.</p>
                    )}
                    {submitStatus.emailSent && !submitStatus.savedToFile && (
                      <p className="text-sm mt-1">Your message was sent via email.</p>
                    )}
                    {!submitStatus.emailSent && submitStatus.savedToFile && (
                      <p className="text-sm mt-1">Your message was saved but couldn't be sent via email. We'll process it soon.</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {submitStatus?.success === false && (
                <Alert className="mb-6 bg-red-50 text-red-800 border-red-200">
                  <Icons.warning className="h-5 w-5" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{submitStatus.message}</AlertDescription>
                </Alert>
              )}
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your Full Name"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="you@example.com"
                            type="email"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="How can we help you?"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us more about your inquiry..."
                            rows={5}
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>

          <div>
            <div className="bg-card border rounded-lg p-8 shadow-sm mb-8">
              <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Icons.home className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Location</h3>
                    <p className="text-muted-foreground">
                      464 T. Sulit St., Martinez Del 96, Pateros Metro Manila
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Icons.shoppingBag className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Phone</h3>
                    <p className="text-muted-foreground">+639682293427</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Icons.mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Email</h3>
                    <p className="text-muted-foreground">caferayah2024@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-6">Business Hours</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Monday - Friday</span>
                  <span className="text-muted-foreground">8:00 AM - 10:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Saturday</span>
                  <span className="text-muted-foreground">9:00 AM - 11:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Sunday</span>
                  <span className="text-muted-foreground">10:00 AM - 9:00 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 