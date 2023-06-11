#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-magic-numbers -- this entire file is magic */

// eslint-disable-next-line import/no-extraneous-dependencies -- used only in dev
import { fakerEN } from "@faker-js/faker";
import bcrypt from "bcryptjs";

import {
  maybeNumber,
  maybeText,
  maybeTrademark,
  maybeYear,
  maybeYearBetween,
} from "./faker";
import { memoizeUnique } from "./faker-unique";

import { MaxLinkCount } from "~/config";
import type { App, AppPlatform, Event, Prisma, User } from "~/prisma-client";
import { PlatformType } from "~/prisma-client";
import { EventVisibility } from "~/prisma-client";
import { UrlType } from "~/prisma-client";
import { PlatformReleaseState } from "~/prisma-client";
import { AppType, EventAppPlatformStatus, UserRole } from "~/prisma-client";
import { PrismaClient } from "~/prisma-client";

const prisma = new PrismaClient();

const faker = fakerEN;

async function seed() {
  const userCount = faker.number.int({ min: 5, max: 50 });
  const eventCount = faker.number.int({ min: 5, max: 15 });
  const studioCount = faker.number.int({ min: 10, max: 50 });
  const appCount = faker.number.int({ min: 30, max: 500 });

  const adminEmail = "admin@example.com";
  const password = "password";

  console.log(
    `⏳ Seed starting. Creating ${userCount} users, ${eventCount} events, ${studioCount} studios and ${appCount} apps.`
  );

  function generateComment() {
    return faker.helpers.maybe(
      () => faker.lorem.paragraphs(faker.number.int({ min: 1, max: 5 })),
      { probability: 0.2 }
    );
  }

  function generateLinks(maxCount = MaxLinkCount) {
    return [...Array.from({ length: faker.number.int(maxCount) }).keys()].map(
      () => {
        return {
          url: faker.internet.url(),
          title: capitalize(faker.word.words()),
          type: faker.helpers.arrayElement(Object.keys(UrlType) as UrlType[]),
          comment: generateComment(),
        };
      }
    );
  }

  console.log(`🦝 Creating ${userCount} users...`);

  const passwordHash = await bcrypt.hash(password, 10);

  const users: User[] = [];

  users.push(
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Admin",
        role: UserRole.Admin,
        password: { create: { hash: passwordHash } },
      },
    })
  );
  for (let index = 0; index < userCount - 1; index++) {
    users.push(
      await prisma.user.create({
        data: {
          email: `user${index + 1}@example.com`,
          name: faker.person.fullName(),
          role: faker.helpers.arrayElement(Object.keys(UserRole) as UserRole[]),
          password: { create: { hash: passwordHash } },
        },
      })
    );
  }

  console.log(`🏢 Creating ${studioCount} studios...`);

  const studios: Array<{
    id: string;
    members: {
      id: string;
    }[];
  }> = [];

  const uniqueStudioName = memoizeUnique(faker.company.name);

  for (let index = 0; index < studioCount; index++) {
    const members: Prisma.StudioMemberCreateManyStudioInput[] = faker.helpers
      .arrayElements(users, faker.number.int({ min: 1, max: 5 }))
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
        name: uniqueStudioName(),
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

  console.log(`🎮 Creating platforms...`);

  const platforms = [
    await prisma.platform.upsert({
      where: { name: "Steam" },
      update: {},
      create: {
        name: "Steam",
        url: "https://store.steampowered.com/",
        type: PlatformType.Steam,
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

  console.log(`👾 Creating ${appCount} apps...`);

  const apps: App[] = [];
  const appPlatforms: AppPlatform[] = [];

  const minAppVersionNumber = 2;
  const maxAppVersionNumber = 5;

  for (let index = 0; index < appCount; index++) {
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
                  min: minAppVersionNumber,
                  max: maxAppVersionNumber,
                  probability: 0.6,
                  space: "before",
                }),
              () =>
                maybeYearBetween({
                  from: faker.date.past({ years: 4 }),
                  to: faker.date.future({ years: 2 }),
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
            min: minAppVersionNumber,
            max: maxAppVersionNumber,
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

    for (const platform of platformsForApp) {
      appPlatforms.push(
        await prisma.appPlatform.create({
          data: {
            appId: app.id,
            platformId: platform.id,
            isEarlyAccess: faker.datatype.boolean(),
            isFreeToPlay: faker.datatype.boolean(),
            releaseState: faker.helpers.arrayElement(
              Object.keys(PlatformReleaseState) as PlatformReleaseState[]
            ),
            links: {
              createMany: {
                data:
                  platform.type === PlatformType.Steam
                    ? faker.helpers.arrayElement([
                        () => generateLinks(),
                        () => {
                          const steamType = faker.helpers.arrayElement([
                            "app",
                            "sub",
                            "bundle",
                          ]);
                          const steamId = faker.number.int();
                          const steamRestUrl = faker.helpers.arrayElement([
                            () => "",
                            () => `/${faker.helpers.slugify(app.name)}`,
                          ])();
                          return [
                            {
                              url: `https://store.steampowered.com/${steamType}/${steamId}${steamRestUrl}`,
                              title: "Store page",
                              type: UrlType.StorePage,
                              comment: generateComment(),
                            },
                            ...generateLinks(MaxLinkCount - 1),
                          ];
                        },
                      ])()
                    : generateLinks(),
              },
            },
          },
        })
      );
    }
  }

  console.log(`📅 Creating ${eventCount} events...`);

  const events: Event[] = [];

  for (let index = 0; index < eventCount; index++) {
    const runningFrom = faker.date.between({
      from: faker.date.past({ years: 4 }),
      to: faker.date.future({ years: 2 }),
    });
    const runningTo = faker.date.soon({
      days: faker.number.int(30),
      refDate: runningFrom,
    });

    const eventName =
      // Prefix
      maybeText(() => {
        const prefix = faker.helpers.arrayElement([
          () => faker.word.adjective(),
          () => faker.location.city(),
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
        .arrayElements(users, faker.number.int({ min: 1, max: 5 }))
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
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  // eslint-disable-next-line unicorn/prefer-top-level-await -- this is a script
  .finally(async () => {
    await prisma.$disconnect();
  });

function capitalize(words: string) {
  return words
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* eslint-enable @typescript-eslint/no-magic-numbers */
