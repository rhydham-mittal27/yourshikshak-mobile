import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "../../constants/colors";
import { s, sh } from "./styles";
import { SH } from "./SectionHead";
import { Chip } from "./Chip";
import { AreaChips } from "./AreaChips";
import { SubjectGroup, modeColor, modeIcon } from "./constants";

interface Props {
  loading: boolean;
  tutor: any;
  subjectHierarchy: SubjectGroup[];
  allSubjects: string[];
  activeBoardIdx: number;
  setActiveBoardIdx: (i: number) => void;
}

export const ProfileTab: React.FC<Props> = ({
  loading,
  tutor,
  subjectHierarchy,
  allSubjects,
  activeBoardIdx,
  setActiveBoardIdx,
}) => {
  return (
    <View>
      {/* teaching mode */}
      {!loading && tutor?.preferredMode && (
        <>
          <SH
            icon="git-merge-outline"
            title="Teaching Mode"
            accent={modeColor[tutor.preferredMode] ?? T.primary}
          />
          <View
            style={[
              s.modeCard,
              {
                borderColor: `${modeColor[tutor.preferredMode] ?? T.primary}30`,
                borderWidth: 1,
              },
            ]}
          >
            <View
              style={[
                s.modeIcon,
                {
                  backgroundColor: `${modeColor[tutor.preferredMode] ?? T.primary}12`,
                },
              ]}
            >
              <Ionicons
                name={modeIcon[tutor.preferredMode] ?? "school-outline"}
                size={18}
                color={modeColor[tutor.preferredMode] ?? T.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  s.modeVal,
                  { color: modeColor[tutor.preferredMode] ?? T.primary },
                ]}
              >
                {tutor.preferredMode}
              </Text>
              <Text style={{ fontSize: 11, color: T.mutedFg, marginTop: 1 }}>
                Preferred teaching mode
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Teaching Info â€” boards + grades + subjects */}
      {!loading &&
        !!(
          subjectHierarchy.length ||
          allSubjects.length ||
          tutor?.preferredBoards?.length ||
          tutor?.settings?.preferredBoards?.length ||
          tutor?.preferredGrades?.length ||
          tutor?.settings?.preferredGrades?.length
        ) && (
          <>
            <SH icon="book-outline" title="Teaching Info" accent="#2D68C4" />
            <View style={s.teachCard}>
              {/* Boards row */}
              {!!(
                tutor?.preferredBoards?.length ||
                tutor?.settings?.preferredBoards?.length
              ) &&
                (() => {
                  const boards = [
                    ...(tutor?.preferredBoards ?? []),
                    ...(tutor?.settings?.preferredBoards ?? []),
                  ].filter(
                    (v: string, i: number, a: string[]) => a.indexOf(v) === i,
                  );
                  return (
                    <View style={s.teachRow}>
                      <View style={s.teachRowIcon}>
                        <Ionicons
                          name="layers-outline"
                          size={11}
                          color="#0EA5E9"
                        />
                      </View>
                      <Text style={s.teachRowLabel}>Boards</Text>
                      <View style={s.teachChips}>
                        {boards.map((b: string, i: number) => (
                          <Chip key={i} label={b} color="#0EA5E9" />
                        ))}
                      </View>
                    </View>
                  );
                })()}

              {/* Grades row */}
              {!!(
                tutor?.preferredGrades?.length ||
                tutor?.settings?.preferredGrades?.length
              ) &&
                (() => {
                  const grades = [
                    ...(tutor?.preferredGrades ?? []),
                    ...(tutor?.settings?.preferredGrades ?? []),
                  ]
                    .filter(
                      (v: string, i: number, a: string[]) => a.indexOf(v) === i,
                    )
                    .sort((a: string, b: string) => {
                      const n = (str: string) =>
                        parseInt(str.replace(/\D/g, "")) || 0;
                      return n(a) - n(b);
                    });
                  return (
                    <View
                      style={[
                        s.teachRow,
                        {
                          borderTopWidth: 1,
                          borderTopColor: T.border,
                          marginTop: 8,
                          paddingTop: 8,
                        },
                      ]}
                    >
                      <View style={s.teachRowIcon}>
                        <Ionicons
                          name="school-outline"
                          size={11}
                          color="#F59E0B"
                        />
                      </View>
                      <Text style={s.teachRowLabel}>Grades</Text>
                      <View style={s.teachChips}>
                        {grades.map((g: string, i: number) => (
                          <Chip key={i} label={g} color="#F59E0B" />
                        ))}
                      </View>
                    </View>
                  );
                })()}

              {/* Subjects â€” compact tabbed hierarchy */}
              {(subjectHierarchy.length > 0 || allSubjects.length > 0) && (
                <View
                  style={[
                    sh.subjectsWrap,
                    {
                      borderTopWidth: 1,
                      borderTopColor: T.border,
                      marginTop: 8,
                      paddingTop: 12,
                    },
                  ]}
                >
                  {/* Row label */}
                  <View style={sh.subjectsHeader}>
                    <View style={s.teachRowIcon}>
                      <Ionicons name="book-outline" size={11} color="#2D68C4" />
                    </View>
                    <Text style={s.teachRowLabel}>Subjects</Text>
                  </View>

                  {subjectHierarchy.length > 0 ? (
                    <View style={{ marginTop: 10 }}>
                      {/* Board tabs */}
                      {subjectHierarchy.length > 1 && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={sh.boardTabs}
                        >
                          {subjectHierarchy.map((bg, bi) => (
                            <Pressable
                              key={bg.board}
                              onPress={() => setActiveBoardIdx(bi)}
                              style={[
                                sh.boardTab,
                                activeBoardIdx === bi && sh.boardTabActive,
                              ]}
                            >
                              <Ionicons
                                name="layers-outline"
                                size={10}
                                color={activeBoardIdx === bi ? "#fff" : "#0EA5E9"}
                              />
                              <Text
                                style={[
                                  sh.boardTabTxt,
                                  activeBoardIdx === bi && sh.boardTabTxtActive,
                                ]}
                              >
                                {bg.board}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      )}
                      {/* Single-board label when only one board */}
                      {subjectHierarchy.length === 1 && (
                        <View style={sh.singleBoardRow}>
                          <Ionicons
                            name="layers-outline"
                            size={11}
                            color="#0EA5E9"
                          />
                          <Text style={sh.singleBoardTxt}>
                            {subjectHierarchy[0].board}
                          </Text>
                        </View>
                      )}

                      {/* Compact grade rows for active board */}
                      {(() => {
                        const board =
                          subjectHierarchy[
                            Math.min(activeBoardIdx, subjectHierarchy.length - 1)
                          ];
                        if (!board) return null;

                        // Collapse consecutive "All Subjects" grades into a range
                        type GradeRow = {
                          rangeLabel: string;
                          subjects: string[];
                        };
                        const rows: GradeRow[] = [];
                        let allSubsRun: string[] = [];

                        const flushRun = () => {
                          if (allSubsRun.length === 0) return;
                          const label =
                            allSubsRun.length === 1
                              ? allSubsRun[0]
                              : `${allSubsRun[0]} â€“ ${allSubsRun[allSubsRun.length - 1]}`;
                          rows.push({
                            rangeLabel: label,
                            subjects: ["All Subjects"],
                          });
                          allSubsRun = [];
                        };

                        for (const gg of board.grades) {
                          const isAllSubs =
                            gg.subjects.length === 1 &&
                            gg.subjects[0].toLowerCase().includes("all");
                          if (isAllSubs) {
                            allSubsRun.push(gg.grade);
                          } else {
                            flushRun();
                            rows.push({
                              rangeLabel: gg.grade,
                              subjects: gg.subjects,
                            });
                          }
                        }
                        flushRun();

                        return (
                          <View style={sh.gradeRows}>
                            {rows.map((row, ri) => (
                              <View key={ri} style={sh.gradeRow}>
                                <Text
                                  style={sh.gradeRowLabel}
                                  numberOfLines={1}
                                >
                                  {row.rangeLabel}
                                </Text>
                                <View style={sh.gradeRowChips}>
                                  {row.subjects.map((sub, si) => (
                                    <Chip
                                      key={si}
                                      label={sub}
                                      rainbow
                                      idx={si}
                                    />
                                  ))}
                                </View>
                              </View>
                            ))}
                          </View>
                        );
                      })()}
                    </View>
                  ) : (
                    /* Flat fallback */
                    <View style={[sh.gradeRowChips, { marginTop: 8 }]}>
                      {allSubjects.map((sub, i) => (
                        <Chip key={i} label={sub} rainbow idx={i} />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}

      {/* qualifications */}
      {!loading && (tutor?.qualifications ?? []).length > 0 && (
        <>
          <SH icon="school-outline" title="Qualifications" accent="#7C3AED" />
          <View style={s.chipWrap}>
            {((tutor?.qualifications ?? []) as any[])
              .map((q: any) =>
                typeof q === "string" ? q : (q?.label ?? q?.name ?? ""),
              )
              .filter(Boolean)
              .map((q: string, i: number) => (
                <Chip key={i} label={q} color="#7C3AED" />
              ))}
          </View>
        </>
      )}

      {/* skills + languages â€” separated into sub-rows */}
      {!loading &&
        !!(tutor?.skills?.length || tutor?.languagesKnown?.length) && (
          <>
            <SH
              icon="flash-outline"
              title="Skills & Languages"
              accent={T.secondary}
            />
            <View style={s.teachCard}>
              {!!tutor?.skills?.length && (
                <View style={[s.teachRow, { alignItems: "flex-start" }]}>
                  <View style={[s.teachRowIcon, { marginTop: 1 }]}>
                    <Ionicons
                      name="flash-outline"
                      size={11}
                      color={T.secondary}
                    />
                  </View>
                  <Text style={[s.teachRowLabel, { marginTop: 1 }]}>Skills</Text>
                  <View style={[s.teachChips, { flexWrap: "wrap" }]}>
                    {(tutor.skills as string[]).map((sk: string, i: number) => (
                      <Chip key={i} label={sk} rainbow idx={i} />
                    ))}
                  </View>
                </View>
              )}
              {!!tutor?.languagesKnown?.length && (
                <View
                  style={[
                    s.teachRow,
                    tutor?.skills?.length
                      ? {
                          borderTopWidth: 1,
                          borderTopColor: T.border,
                          marginTop: 8,
                          paddingTop: 8,
                        }
                      : {},
                    { alignItems: "flex-start" },
                  ]}
                >
                  <View style={[s.teachRowIcon, { marginTop: 1 }]}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={11}
                      color="#14B8A6"
                    />
                  </View>
                  <Text style={[s.teachRowLabel, { marginTop: 1 }]}>
                    Languages
                  </Text>
                  <View style={[s.teachChips, { flexWrap: "wrap" }]}>
                    {(tutor.languagesKnown as string[]).map(
                      (l: string, i: number) => (
                        <Chip key={i} label={l} color="#14B8A6" />
                      ),
                    )}
                  </View>
                </View>
              )}
            </View>
          </>
        )}

      {/* extracurricular activities */}
      {!loading && !!tutor?.extracurricularActivities?.length && (
        <>
          <SH
            icon="color-palette-outline"
            title="Extracurricular"
            accent="#EC4899"
          />
          <View style={s.chipWrap}>
            {(tutor.extracurricularActivities as string[]).map(
              (a: string, i: number) => (
                <Chip key={i} label={a} color="#EC4899" />
              ),
            )}
          </View>
        </>
      )}

      {/* availability */}
      {!loading &&
        tutor?.settings?.availabilityPreferences &&
        (() => {
          const avail = tutor.settings.availabilityPreferences;
          if (!avail.daysAvailable?.length && !avail.timeSlots?.length)
            return null;
          return (
            <>
              <SH
                icon="calendar-outline"
                title="Availability"
                accent={T.success}
              />
              {avail.daysAvailable?.length > 0 && (
                <View style={{ gap: 8, marginBottom: 10 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: T.mutedFg,
                      textTransform: "uppercase",
                      letterSpacing: 0.7,
                    }}
                  >
                    Available Days
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    {avail.daysAvailable.map((day: string, i: number) => (
                      <View
                        key={day}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 20,
                          backgroundColor: `${T.success}10`,
                          borderWidth: 1,
                          borderColor: `${T.success}28`,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: T.success,
                          }}
                        >
                          {day}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {avail.timeSlots?.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: T.mutedFg,
                      textTransform: "uppercase",
                      letterSpacing: 0.7,
                    }}
                  >
                    Time Slots
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    {avail.timeSlots.map((slot: string, i: number) => (
                      <View
                        key={slot}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 20,
                          backgroundColor: `${T.primary}10`,
                          borderWidth: 1,
                          borderColor: `${T.primary}28`,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: T.primary,
                          }}
                        >
                          {slot}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          );
        })()}

      {/* preferred locations */}
      {!loading &&
        !!(
          tutor?.preferredCities?.length || tutor?.preferredLocations?.length
        ) && (
          <>
            <SH
              icon="location-outline"
              title="Preferred Areas"
              accent="#E11D48"
            />
            <View style={s.areasCard}>
              {tutor?.preferredCities?.length > 0 && (
                <View>
                  <Text style={s.areasLabel}>Cities</Text>
                  <View style={s.chipWrap}>
                    {(tutor.preferredCities as any[])
                      .slice(0, 6)
                      .map((c: any, i: number) => (
                        <Chip
                          key={`city${i}`}
                          label={c?.label ?? c?.name ?? c}
                          color="#0EA5E9"
                        />
                      ))}
                  </View>
                </View>
              )}
              {tutor?.preferredLocations?.length > 0 && (
                <AreaChips
                  locations={tutor.preferredLocations as string[]}
                  hasDivider={!!tutor?.preferredCities?.length}
                />
              )}
            </View>
          </>
        )}

      {/* addresses */}
      <SH icon="map-outline" title="Addresses" accent="#E11D48" />
      <View style={{ gap: 8 }}>
        <View style={[s.addrBox, { borderLeftColor: "#E11D48" }]}>
          <Text style={[s.addrTag, { color: "#E11D48" }]}>Permanent</Text>
          <Text style={s.addrVal}>
            {tutor?.permanentAddress || "Not provided"}
          </Text>
        </View>
        <View style={[s.addrBox, { borderLeftColor: "#7C3AED" }]}>
          <Text style={[s.addrTag, { color: "#7C3AED" }]}>Residential</Text>
          <Text style={s.addrVal}>
            {tutor?.residentialAddress || "Same as permanent"}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ProfileTab;

