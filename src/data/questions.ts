export type Question = {
  id: number;
  level: "basic" | "hard";
  q: string;
  options: string[];
  answer: number; // index
};

export const QUESTIONS: Question[] = [
  // ---------- BASIC (10) ----------
  { id: 1, level: "basic", q: "Which keyword is used to define a class in Java?", options: ["class", "Class", "define", "struct"], answer: 0 },
  { id: 2, level: "basic", q: "What is the size of an int in Java?", options: ["2 bytes", "4 bytes", "8 bytes", "Depends on JVM"], answer: 1 },
  { id: 3, level: "basic", q: "Which method is the entry point of a Java program?", options: ["start()", "run()", "main()", "init()"], answer: 2 },
  { id: 4, level: "basic", q: "Which of these is NOT a primitive type?", options: ["int", "boolean", "String", "char"], answer: 2 },
  { id: 5, level: "basic", q: "Default value of a boolean instance variable?", options: ["true", "false", "null", "0"], answer: 1 },
  { id: 6, level: "basic", q: "Which operator is used for string concatenation?", options: ["&", "+", ".", ","], answer: 1 },
  { id: 7, level: "basic", q: "Which keyword is used to inherit a class?", options: ["this", "super", "extends", "implements"], answer: 2 },
  { id: 8, level: "basic", q: "Which package is imported by default?", options: ["java.util", "java.io", "java.lang", "java.net"], answer: 2 },
  { id: 9, level: "basic", q: "What is the correct way to create an array of 5 ints?", options: ["int a[5];", "int[] a = new int[5];", "int a = new int(5);", "array int a[5];"], answer: 1 },
  { id: 10, level: "basic", q: "Which loop guarantees execution at least once?", options: ["for", "while", "do-while", "foreach"], answer: 2 },

  // ---------- HARD (10) ----------
  { id: 11, level: "hard", q: "What does JVM stand for and what is its primary role?", options: ["Java Virtual Machine — runs bytecode", "Java Visual Manager — manages UI", "Just Virtual Memory — RAM allocator", "Java Variable Mapper"], answer: 0 },
  { id: 12, level: "hard", q: "Which of the following best describes 'final', 'finally', and 'finalize'?", options: ["All are keywords", "final = constant; finally = block; finalize = method", "All are methods", "All are blocks"], answer: 1 },
  { id: 13, level: "hard", q: "What is the output of: System.out.println(10 + 20 + \"Java\" + 10 + 20);", options: ["30Java30", "30Java1020", "1020Java1020", "10 20 Java 10 20"], answer: 1 },
  { id: 14, level: "hard", q: "Which collection does NOT allow duplicate elements?", options: ["ArrayList", "LinkedList", "HashSet", "Vector"], answer: 2 },
  { id: 15, level: "hard", q: "What happens if a checked exception is not handled?", options: ["Program runs fine", "Compile-time error", "Runtime warning only", "Skipped silently"], answer: 1 },
  { id: 16, level: "hard", q: "Difference between '==' and .equals() for String?", options: ["Both compare values", "== compares references; equals compares values", "Both compare references", "equals is faster"], answer: 1 },
  { id: 17, level: "hard", q: "Which of these creates a thread correctly?", options: ["Implementing Runnable and passing to Thread", "Calling run() directly", "Extending Process", "Using new Thread().start() without target"], answer: 0 },
  { id: 18, level: "hard", q: "What is method overloading?", options: ["Same name, different parameters in same class", "Same name and signature in subclass", "Multiple classes same name", "Multiple constructors in different classes"], answer: 0 },
  { id: 19, level: "hard", q: "Which keyword prevents method overriding?", options: ["static", "private", "final", "const"], answer: 2 },
  { id: 20, level: "hard", q: "What is the time complexity of HashMap.get() in average case?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 0 },
];