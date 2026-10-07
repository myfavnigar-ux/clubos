# ClubOS Firebase setup — clubosdrmc

## এখন যে ব্যবস্থা যুক্ত আছে

- Authentication: শিক্ষার্থীর signup, email/password login, verification email, password reset।
- D1: ফেস্ট, ইভেন্ট, রেজিস্ট্রেশন, check-in ও নির্ভুল seat count-এর মূল ডেটাবেস।
- Firestore: ব্যক্তিগত student profile, blog, helpline।
- Realtime Database: প্রকাশ্য announcement ও প্রত্যেক অ্যাকাউন্টের notification read status।
- `/admin`: শুধু অনুমোদিত অ্যাকাউন্টে email/password দিলেই dashboard; অ্যাডমিনের জন্য অতিরিক্ত email-verification gate নেই।

## আপনার অ্যাকাউন্টের প্রস্তুতি

Email/Password provider এবং `clubos-carnival-somudro.anaim12.chatgpt.site` authorized domain Console-এ দেখা গেছে। আপনার দেওয়া UID `LBRaxtFe2kg6tbke5adJqgLxKzZ2` server-এর `CLUBOS_ADMIN_UIDS`-এ সেট করা হয়েছে। পরিবেশের এই পরিবর্তন নতুন deployment-এ কার্যকর হয়। একই UID দুটি database rules ফাইলেও আছে।

পাসওয়ার্ড বা service-account private key পাঠানোর প্রয়োজন নেই। [Admin page](https://clubos-carnival-somudro.anaim12.chatgpt.site/admin)-এ নিজের অ্যাকাউন্ট ব্যবহার করুন। নতুন কোনো admin যোগ করলে server allowlist এবং দুই database-এর rules—সব জায়গায় একই অনুমোদন রাখতে হবে।

## Firestore

Standard `(default)` database, Singapore `asia-southeast1` তৈরি হয়েছে। Console → Firestore → Rules-এ `firebase/firestore.rules`-এর সম্পূর্ণ লেখা বসিয়ে Publish করতে হবে। বর্তমান প্রকাশের অবস্থা `LAUNCH-STATUS.md`-তে আছে।

Rules অনুযায়ী শিক্ষার্থী শুধু নিজের profile পড়তে/লিখতে পারে; admin সব profile পড়তে পারে। শুধু প্রকাশিত blog ও সক্রিয় support contact সবাই পড়তে পারে; সেগুলো লিখতে পারে শুধু admin। অন্য সব path বন্ধ।

প্রথম সফল admin visit-এ ১০টি sample blog ও দুটি placeholder support contact একটি transaction দিয়ে তৈরি হয়। একই seed আবার চলে না; বিদ্যমান লেখা মুছে যায় না। ছাত্র প্রথম sign-in করলে তার নিজস্ব profile তৈরি হয়; My profile থেকে তথ্য সম্পাদনা করা যায়।

## Realtime Database

Realtime Database এখন Singapore অঞ্চলে তৈরি আছে। Console-এ দেখা সঠিক URL `https://clubosdrmc-default-rtdb.asia-southeast1.firebasedatabase.app` কোডের `databaseURL`-এ যুক্ত করা হয়েছে। আগের provisioning error এখন আর বর্তমান অবস্থা নয়। নতুন করে database তৈরি করার প্রয়োজন নেই।

Rules tab-এ `firebase/database.rules.json`-এর সম্পূর্ণ JSON প্রকাশ করা হয়েছে। এতে announcement সবাই পড়তে পারে, শুধু admin লিখতে পারে। `notificationReads/<uid>` শুধু ওই অ্যাকাউন্ট পড়তে/লিখতে পারে। কোনো private student তথ্য announcement-এ দেবেন না। অ্যাডমিনে লগইন করে Announcements → New announcement → Save changes দিয়ে প্রথম ঘোষণা তৈরি করুন।

## ব্যবহার ও যাচাই

1. শিক্ষার্থী: Create account → inbox/spam-এ verification link → সাইটে **I’ve verified my email**।
2. **My profile**-এ প্রতিষ্ঠান, শ্রেণি, ফোন, আগ্রহ ও পরিচিতি লিখুন।
3. ইভেন্টে Register → ticket → My registrations / My schedule।
4. অ্যাডমিন: Participants-এ নাম চাপলে ticket, ব্যক্তিগত profile ও registration history খুলবে। Student profiles-এ অ্যাকাউন্ট অনুযায়ী সব নিবন্ধন দেখা যাবে।
5. Event management-এ ছবি URL, নাম, সময়, fest, category, venue, capacity, format, rules, eligibility ও requirements সম্পাদনা করুন; Pause registration দিয়ে নতুন বুকিং বন্ধ করুন।
6. Blogs-এ draft/publish; Announcements-এ publish/edit/archive। Notifications in-app; push, SMS বা notification email নয়।
7. Helpline-এ আসল নম্বর বসালে Call now `tel:` দিয়ে ফোনের dialer খুলবে। `+880 1XXXXXXXXX` নমুনা নম্বরে কল হয় না।
8. বাস্তব student registration → admin detail → check-in এবং email delivery যাচাই করুন। Automated tests Google responses simulate করে; প্রকৃত inbox-এর পরীক্ষা নয়।

Firestore ও Realtime Database-এর rules প্রকাশিত। ব্যক্তিগত profile ও admin writes-এর জন্য যথাযথ অ্যাকাউন্টে sign-in করতে হবে। D1 registration আলাদা কাজ করে। Firebase Storage, Cloud Functions, Hosting বা Analytics চালু করতে হবে না; কোনো billing upgrade করা হয়নি।

## স্থানীয় উন্নয়ন

Node 24, `npm ci`, build, এবং `drizzle/`-এর দুই migration filename অনুযায়ী একবার local D1-তে প্রয়োগ করুন। Local `.dev.vars`-এ `CLUBOS_ADMIN_UIDS` রাখুন (Git-ignored)। Firebase-এ local host অনুমোদন করুন। Production environment Sites-এ সেট করে deploy করতে হয়; `.dev.vars` upload করা হয় না।
