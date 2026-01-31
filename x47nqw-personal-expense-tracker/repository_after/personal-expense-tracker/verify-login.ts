
import { prisma } from "./lib/prisma";
import bcryptjs from "bcryptjs";

async function main() {
    const email = "test2@example.com";
    const password = "password123";

    console.log(`Checking user: ${email}`);
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.log("User not found via Prisma!");
        return;
    }
    console.log("User found:", user.email);

    console.log("Comparing password...");
    const isValid = await bcryptjs.compare(password, user.password || "");
    console.log(`Password valid: ${isValid}`);
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error(e);
        prisma.$disconnect();
    });
