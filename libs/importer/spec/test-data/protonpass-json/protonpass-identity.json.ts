import { ProtonPassJsonFile } from "../../../src/importers/protonpass/types/protonpass-json-type";

export const identityItemTestData: ProtonPassJsonFile = {
  encrypted: false,
  userId:
    "97AKUKQLkB-5BTBjoVgm3es34k8p5_UiKdxLnKb_57b4sekoGHKmKYV__6LMonA_00AKVBzWM-CL1Htkqkwl8Q==",
  vaults: {
    "TpawpLbs1nuUlQUCtgKZgb3zgAvbrGrOaqOylKqVe_RLROEyUvMq8_ZEuGw73PGRUSr89iNtQ2NosuggP54nwA==": {
      name: "Personal",
      description: "Personal vault",
      display: { color: 0, icon: 0 },
      items: [
        {
          itemId:
            "gliCOyyJOsoBf5QIijvCF4QsPij3q_MR4nCXZ2sXm7YCJCfHjrRD_p2XG9vLsaytErsQvMhcLISVS7q8-7SCkg==",
          shareId:
            "TpawpLbs1nuUlQUCtgKZgb3zgAvbrGrOaqOylKqVe_RLROEyUvMq8_ZEuGw73PGRUSr89iNtQ2NosuggP54nwA==",
          data: {
            metadata: {
              name: "Identity",
              note: "",
              itemUuid: "c2e52768",
            },
            extraFields: [
              {
                fieldName: "TestExtra",
                type: "text",
                data: {
                  content: "Extra",
                },
              },
            ],
            type: "identity",
            content: {
              fullName: "Test 1",
              email: "test@gmail.com",
              phoneNumber: "7507951789",
              firstName: "Test",
              middleName: "1",
              lastName: "Test",
              birthdate: "",
              gender: "Male",
              extraPersonalDetails: [
                {
                  fieldName: "TestPersonal",
                  type: "text",
                  data: {
                    content: "Personal",
                  },
                },
              ],
              organization: "Bitwarden",
              streetAddress: "23 Street",
              zipOrPostalCode: "4038456",
              city: "New York",
              stateOrProvince: "Test",
              countryOrRegion: "US",
              floor: "12th Foor",
              county: "Test County",
              extraAddressDetails: [
                {
                  fieldName: "TestAddress",
                  type: "text",
                  data: {
                    content: "Address",
                  },
                },
              ],
              socialSecurityNumber: "98378264782",
              passportNumber: "7173716378612",
              licenseNumber: "21234",
              website: "",
              xHandle: "@twiter",
              secondPhoneNumber: "243538978",
              linkedin: "",
              reddit: "",
              facebook: "",
              yahoo: "",
              instagram: "@insta",
              extraContactDetails: [
                {
                  fieldName: "TestContact",
                  type: "hidden",
                  data: {
                    content: "Contact",
                  },
                },
              ],
              company: "Bitwarden",
              jobTitle: "Engineer",
              personalWebsite: "",
              workPhoneNumber: "78236476238746",
              workEmail: "",
              extraWorkDetails: [
                {
                  fieldName: "TestWork",
                  type: "hidden",
                  data: {
                    content: "Work",
                  },
                },
              ],
              extraSections: [
                {
                  sectionName: "TestSection",
                  sectionFields: [
                    {
                      fieldName: "TestSection",
                      type: "text",
                      data: {
                        content: "Section",
                      },
                    },
                    {
                      fieldName: "TestSectionHidden",
                      type: "hidden",
                      data: {
                        content: "SectionHidden",
                      },
                    },
                  ],
                },
              ],
            },
          },
          state: 1,
          aliasEmail: null,
          contentFormatVersion: 6,
          createTime: 1725707298,
          modifyTime: 1725707298,
          pinned: false,
        },
        {
          itemId:
            "WTKLZtKfHIC3Gv7gRXUANifNjj0gN3P_52I4MznAzig9GSb_OgJ0qcZ8taOZyfsFTLOWBslXwI-HSMWXVmnKzQ==",
          shareId:
            "TpawpLbs1nuUlQUCtgKZgb3zgAvbrGrOaqOylKqVe_RLROEyUvMq8_ZEuGw73PGRUSr89iNtQ2NosuggP54nwA==",
          data: {
            metadata: { name: "Alias", note: "", itemUuid: "576f14fa" },
            extraFields: [],
            type: "alias",
            content: {},
          },
          state: 1,
          aliasEmail: "alias.removing005@passinbox.com",
          contentFormatVersion: 6,
          createTime: 1725708208,
          modifyTime: 1725708208,
          pinned: false,
        },
      ],
    },
  },
  version: "1.22.3",
};
