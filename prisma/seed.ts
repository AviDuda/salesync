import type { App, AppPlatform, Event, Prisma, User } from "~/prisma-client";
import { EventVisibility } from "~/prisma-client";
import { UrlType } from "~/prisma-client";
import { PlatformReleaseState } from "~/prisma-client";
import { AppType, EventAppPlatformStatus, UserRole } from "~/prisma-client";
import { PrismaClient } from "~/prisma-client";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { MaxLinkCount } from "~/config";
import {
  maybeNumber,
  maybeYearBetween,
  maybeText,
  maybeTrademark,
  maybeYear,
} from "./faker";

const prisma = new PrismaClient();

async function seed() {
  faker.setLocale("en");

  const userCount = faker.datatype.number({ min: 5, max: 50 });
  const eventCount = faker.datatype.number({ min: 5, max: 15 });
  const studioCount = faker.datatype.number({ min: 5, max: 20 });
  const appCount = faker.datatype.number({ min: 10, max: 50 });

  function capitalize(words: string) {
    return words
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function generateComment() {
    return faker.helpers.maybe(
      () => faker.lorem.paragraphs(faker.datatype.number({ min: 1, max: 5 })),
      { probability: 0.2 }
    );
  }

  function generateLinks() {
    return [...Array(faker.datatype.number(MaxLinkCount)).keys()].map(() => {
      return {
        url: faker.internet.url(),
        title: capitalize(faker.random.words()),
        type: faker.helpers.arrayElement(Object.keys(UrlType) as UrlType[]),
        comment: generateComment(),
      };
    });
  }

  const passwordHash = await bcrypt.hash("password", 10);

  const users: User[] = [];

  users.push(
    await prisma.user.create({
      data: {
        email: "admin@example.com",
        name: "Admin",
        role: UserRole.Admin,
        password: { create: { hash: passwordHash } },
      },
    })
  );
  for (let i = 0; i < userCount; i++) {
    users.push(
      await prisma.user.create({
        data: {
          email: `user${i + 1}@example.com`,
          name: faker.name.fullName(),
          role: faker.helpers.arrayElement(Object.keys(UserRole) as UserRole[]),
          password: { create: { hash: passwordHash } },
        },
      })
    );
  }

  const studios: Array<{
    id: string;
    members: {
      id: string;
    }[];
  }> = [];

  for (let i = 0; i < studioCount; i++) {
    const members: Prisma.StudioMemberCreateManyStudioInput[] = faker.helpers
      .arrayElements(users, faker.datatype.number({ min: 1, max: 5 }))
      .map((user) => {
        return {
          userId: user.id,
          position: faker.helpers.arrayElement([
            "Owner",
            "Developer",
            "Marketing",
            "PR",
            "Business relations",
          ]),
        };
      });

    const studio = await prisma.studio.create({
      data: {
        name: faker.company.name(),
        comment: generateComment(),
        members: { createMany: { data: members } },
        links: { createMany: { data: generateLinks() } },
      },
      select: { id: true, members: { select: { id: true } } },
    });

    await prisma.studio.update({
      where: { id: studio.id },
      data: { mainContactId: faker.helpers.arrayElement(studio.members).id },
    });

    studios.push(studio);
  }

  const platforms = [
    await prisma.platform.upsert({
      where: { name: "Steam" },
      update: {},
      create: {
        name: "Steam",
        url: "https://store.steampowered.com/",
      },
    }),
    await prisma.platform.upsert({
      where: { name: "itch.io" },
      update: {},
      create: { name: "itch.io" },
    }),
    await prisma.platform.upsert({
      where: { name: "Xbox Series X" },
      update: {},
      create: { name: "Xbox Series X" },
    }),
    await prisma.platform.upsert({
      where: { name: "PlayStation 5" },
      update: {},
      create: { name: "PlayStation 5" },
    }),
    await prisma.platform.upsert({
      where: { name: "Google Play" },
      update: {},
      create: { name: "Google Play" },
    }),
    await prisma.platform.upsert({
      where: { name: "iOS App Store" },
      update: {},
      create: { name: "iOS App Store" },
    }),
  ];

  const apps: App[] = [];
  const appPlatforms: AppPlatform[] = [];

  const minAppVersionNum = 2;
  const maxAppVersionNum = 5;

  for (let i = 0; i < appCount; i++) {
    const appName =
      faker.helpers.arrayElement([
        // Noun [Simulator|Manager|Tycoon][tm] [year|number]
        () =>
          faker.word.noun() +
          " " +
          faker.helpers.arrayElement(["Simulator", "Manager", "Tycoon"]) +
          maybeTrademark() +
          // Bump up the version/year probability for this type of games
          maybeText(() =>
            faker.helpers.arrayElement([
              () =>
                maybeNumber({
                  min: minAppVersionNum,
                  max: maxAppVersionNum,
                  probability: 0.6,
                  space: "before",
                }),
              () =>
                maybeYearBetween({
                  from: faker.date.past(4),
                  to: faker.date.future(2),
                  probability: 0.6,
                  space: "before",
                }),
            ])()
          ),
        // Other variants just with an optional trademark and number
        () =>
          faker.helpers.arrayElement([
            // (The) (Elder) Scrolls
            () =>
              maybeText(() => faker.word.preposition() + " ", {
                probability: 0.15,
              }) +
              maybeText(() => faker.word.adjective() + " ") +
              faker.word.noun(),
            // Mount &/and/or Blade
            () =>
              faker.word.noun() +
              faker.helpers.arrayElement([" and ", " & ", " or "]) +
              faker.word.noun(),
            // [Loud|Madly] &/and/or Clear
            () =>
              faker.helpers.arrayElement([
                faker.word.adjective(),
                faker.word.adverb(),
              ]) +
              faker.helpers.arrayElement([" and ", " & ", " or "]) +
              faker.word.adjective(),
            // Without Limit
            () => faker.word.preposition() + " " + faker.word.noun(),
            // Call of Duty
            () => faker.word.verb() + " of " + faker.word.noun(),
          ])() +
          // (Registered) trademark
          maybeTrademark() +
          // Number suffix
          maybeNumber({
            min: minAppVersionNum,
            max: maxAppVersionNum,
            probability: 0.2,
            space: "before",
          }),
      ])() +
      // Subtitle
      maybeText(
        () =>
          faker.helpers.arrayElement([": ", " - ", " — "]) +
          faker.helpers.arrayElement([
            // Die Harder
            () => faker.word.verb() + " " + faker.word.adjective(),
            // Productive Poverty
            () => faker.word.adjective() + " " + faker.word.noun(),
            // Without Limits
            () => faker.word.preposition() + " " + faker.word.noun(),
            // Gosh, Chit-chat
            () => faker.word.interjection() + " " + faker.word.noun(),
            // Madly Without Love
            () =>
              faker.word.adverb() +
              " " +
              faker.word.preposition() +
              " " +
              faker.word.noun(),
          ])()
      );

    const app = await prisma.app.create({
      data: {
        name: capitalize(appName),
        type: faker.helpers.arrayElement(Object.keys(AppType) as AppType[]),
        comment: generateComment(),
        studioId: faker.helpers.arrayElement(studios).id,
      },
    });

    apps.push(app);

    const platformsForApp =
      faker.helpers.maybe(() => faker.helpers.arrayElements(platforms), {
        probability: 0.7,
      }) ?? [];

    platformsForApp.forEach(async (platform) => {
      appPlatforms.push(
        await prisma.appPlatform.create({
          data: {
            appId: app.id,
            platformId: platform.id,
            isFreeToPlay: faker.datatype.boolean(),
            releaseState: faker.helpers.arrayElement(
              Object.keys(PlatformReleaseState) as PlatformReleaseState[]
            ),
            links: { createMany: { data: generateLinks() } },
          },
        })
      );
    });
  }

  const events: Event[] = [];

  for (let i = 0; i < eventCount; i++) {
    const runningFrom = faker.date.between(
      faker.date.past(4),
      faker.date.future(2)
    );
    const runningTo = faker.date.soon(faker.datatype.number(30), runningFrom);

    const eventName =
      // Prefix
      maybeText(() => {
        const prefix = faker.helpers.arrayElement([
          () => faker.word.adjective(),
          () => faker.address.cityName(),
        ])();
        return `${prefix} `;
      }) +
      // Main noun
      faker.word.noun() +
      " " +
      // Fest name
      faker.helpers.arrayElement([
        "Week",
        "Celebration",
        "Fest",
        "Festival",
        "Festivity",
        "Jubilee",
        "Fiesta",
        "Fair",
        "Show",
        "Showcase",
        "Gala",
      ]) +
      // Year suffix - 21 or 2021
      maybeYear({ date: runningFrom, space: "before" });

    const coordinators: Prisma.EventCoordinatorCreateManyEventInput[] =
      faker.helpers
        .arrayElements(users, faker.datatype.number({ min: 1, max: 5 }))
        .map((user) => {
          return { userId: user.id };
        });

    const appPlatformsForEvent = faker.helpers.arrayElements(appPlatforms);

    events.push(
      await prisma.event.create({
        data: {
          name: capitalize(eventName),
          runningFrom,
          runningTo,
          coordinators: { createMany: { data: coordinators } },
          visibility: faker.helpers.arrayElement(
            Object.keys(EventVisibility) as EventVisibility[]
          ),
          eventAppPlatforms: {
            createMany: {
              data: appPlatformsForEvent.map((appPlatform) => {
                return {
                  appPlatformId: appPlatform.id,
                  status: faker.helpers.arrayElement(
                    Object.keys(
                      EventAppPlatformStatus
                    ) as EventAppPlatformStatus[]
                  ),
                  comment: generateComment(),
                };
              }),
            },
          },
        },
      })
    );
  }

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
