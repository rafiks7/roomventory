"use client";

import {
  Box,
  Grid,
  Typography,
  Modal,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Tooltip,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  Select,
  MenuItem,
} from "@mui/material";
import TooltipIcon from "../../Components/tooltipicon";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Category, Opacity, Search } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { db } from "/firebase";
import {
  writeBatch,
  doc,
  collection,
  getDoc,
  deleteDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useSearchParams } from "next/navigation";

import banner from "../../public/banner.png";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

// colors
const green_white = "#F3F6F9";
const green_light = "#D3F8CC";
const green_dark = "#4E826B";
const gray_dark = "#1C2025";

export default function Inventory() {
  /****************************************************** States ******************************************************/

  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  // Data to be fetched from Firebase
  const [inventories, setInventories] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isLeader, setIsLeader] = useState(false);

  // States for handling functions
  const [search, setSearch] = useState("");
  const [addInventoryModal, setAddInventoryModal] = useState(false);
  const [inventoryName, setInventoryName] = useState("");
  const [items, setItems] = useState([]);
  const [neededItems, setNeededItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [email, setEmail] = useState("");
  const [suggestedItems, setSuggestedItems] = useState({});

  // Item Metadata
  const [selectedInventory, setSelectedInventory] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(null);
  const [category, setCategory] = useState(null);
  const [expiryDate, setExpiryDate] = useState(null);
  const [isPerishable, setIsPerishable] = useState(false);
  const [notes, setNotes] = useState("");

  //Modals
  const [openMemberModal, setOpenMemberModal] = useState(false);
  const [openNewInventoryModal, setOpenNewInventoryModal] = useState(false);
  const [openAddItemModal, setOpenAddItemModal] = useState(false);

  // Get group name from URL
  const searchParams = useSearchParams();
  const groupName = searchParams.get("id");

  const textInput = useRef(null);

  //get Username
  const userName = user ? user.firstName + " " + user.lastName : "";

  /****************************************************** Use Effects ******************************************************/

  //fetching inventory data (1 READ operation)
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return;

        const inventoriesCol = collection(
          db,
          "groups",
          groupName,
          "inventories"
        );

        //READ
        const inventoriesSnap = await getDocs(inventoriesCol);

        const inventoriesList = [];

        // Collect promises if there are async operations to perform on itemsCol
        const inventoriesPromises = inventoriesSnap.docs.map(
          async (inventory) => {
            const inventoryData = inventory.data();
            inventoriesList.push(inventoryData);

            const itemsCol = inventoryData.items;
          }
        );

        // Wait for all inventory promises to resolve
        await Promise.all(inventoriesPromises);

        setInventories(inventoriesList);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [user, groupName]);

  /*
  useEffect(() => {
    const getMembers = async () => {
      const groupRef = doc(collection(db, "groups"), groupName);
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        console.log("groupData", groupData);
        setGroupMembers(groupData.members);
      }
    };

    getMembers();
  }, [user, groupName]);
  */

  // Fetching group data (1 READ operation)
  useEffect(() => {
    const getLeaderState = async () => {
      try {
        const groupRef = doc(db, "groups", groupName);
        //READ
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
          const groupData = groupSnap.data();
          const member = groupData.members.find(
            (member) => member.name === userName
          );
          const leaderState = member ? member.leader : false;
          setIsLeader(leaderState);
          setGroupMembers(groupData.members);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    getLeaderState();
  }, [user]);

  /****************************************************** Handling Group Members ******************************************************/

  // Function to invite a member to the group (only leader can invite members)
  const handleInvite = async (event) => {
    if (!isLeader) {
      alert("You must be the leader of the group to invite members");
    }
    if (!email) {
      return;
    }
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Specify the content type
      },
      body: JSON.stringify({ email: email, group: groupName }), // Stringify the email object
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
  };

  // Function to kick a member from the group (only leader can kick members) (2 READ, 2 WRITE operations)
  const kickMember = async (member) => {
    if (!isLeader) {
      alert("You must be the leader of the group to kick members");
    }
    const groupRef = doc(collection(db, "groups"), groupName);
    //READ
    const groupSnap = await getDoc(groupRef);

    if (groupSnap.exists()) {
      const groupData = groupSnap.data();
      const newMembers = groupData.members.filter(
        (groupMember) => groupMember.name !== member
      );

      //WRITE
      await updateDoc(groupRef, {
        members: newMembers,
      });
      setGroupMembers(newMembers);

      const userRef = doc(collection(db, "users"), user.id);
      //READ
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const newGroups = userData.groups.filter(
          (group) => group !== groupName
        );

        //WRITE
        await updateDoc(userRef, {
          groups: newGroups,
        });
      }
    }
  };

  // Function to leave the group (1 READ, 1 WRITE, 1 DELETE operation)
  const leaveGroup = async () => {
    const userDocRef = doc(collection(db, "users"), user.id);

    const groupDocRef = doc(collection(db, "groups"), groupName);

    const batch = writeBatch(db);

    //adjust user's groups
    try {
      //READ
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const newGroups = userData.groups.filter(
          (group) => group !== groupName
        );

        batch.update(userDocRef, {
          groups: newGroups,
        });
      }
    } catch (error) {
      console.error("Error adjusting user's groups:", error);
      alert("An error occurred while leaving the group. Please try again.");
    }

    //adjust group's members
    try {
      //READ
      const groupSnap = await getDoc(groupDocRef);
      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const newMembers = groupData.members.filter(
          (member) => member.name !== userName
        );

        if (newMembers.length === 0) {
          //DELETE
          await deleteGroup(groupName, batch);
        } else {
          newMembers[0].leader = true;
          batch.update(groupDocRef, {
            members: newMembers,
          });
        }
      }
    } catch (error) {
      console.error("Error adjusting group's members:", error);
      alert("An error occurred while leaving the group. Please try again.");
    }

    await batch.commit();
    setGroupName("");
  };

  /****************************************************** AI Suggestions ******************************************************/

  //just for testing (change it to be dynamic later)
  const exampleInventory = "Bathroom";

  // Function to get suggestions from the AI
  const getSuggestions = async () => {
    const selectedInventory = inventories.find(
      (inventory) => inventory.name === exampleInventory
    );

    await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ selectedInventory }),
    })
      .then((response) => response.json())
      .then((data) => {
        setSuggestedItems({ inventory: exampleInventory, items: data });
      });
  };

  /****************************************************** Inventory Functions ******************************************************/

  //function to add an inventory in a group to the database (1 READ, WRITE operation)
  const createInventory = async () => {
    if (!inventoryName) {
      alert("Please enter an inventory name");
      return;
    }

    const batch = writeBatch(db);

    const groupRef = doc(collection(db, "groups"), groupName);
    const inventoryCollection = collection(groupRef, "inventories");

    const inventoryRef = doc(inventoryCollection, inventoryName);
    //READ
    const inventorySnap = await getDoc(inventoryRef);

    if (inventorySnap.exists()) {
      alert("Inventory already exists");
      return;
    } else {
      //WRITE
      await setDoc(inventoryRef, {
        name: inventoryName,
        items: [],
        neededItems: [],
      });
    }
    setInventoryName("");
  };

  //function to delete an inventory in a group from the database (1 READ, 1 DELETE operation)
  const deleteInventory = async () => {
    try {
      const groupRef = doc(collection(db, "groups"), groupName);
      const inventoryCollection = collection(groupRef, "inventories");

      const inventoryRef = doc(inventoryCollection, exampleInventory); //inventory should be dynamically selected

      //READ
      const inventorySnap = await getDoc(inventoryRef);

      if (inventorySnap.exists()) {
        //DELETE
        await deleteDoc(inventoryRef);
      } else {
        alert("Inventory does not exist");
      }
    } catch (error) {
      console.error("Error deleting inventory:", error);
    }
    setInventoryName("");
  };

  /****************************************************** Expense Tracking ******************************************************/

  // Function to add an expense to the group (1 READ, 1 WRITE operation)
  const addExpense = async (price) => {
    /*If person bought it:
	      Owe = price/#members - price
      If not:
	      Owe = price/#members
   */

    const examplePrice = 10;
    const groupRef = doc(collection(db, "groups"), groupName);
    //READ
    const groupSnap = await getDoc(groupRef);
    const members = groupSnap.data().members;
    const newMembers = members.map((member) => {
      return {
        ...member,
        owe:
          member.owe +
          (member.leader
            ? examplePrice / members.length - examplePrice
            : examplePrice / members.length),
      };
    });

    //WRITE
    await updateDoc(groupRef, { members: newMembers });

    setGroupMembers(newMembers);
  };

  // Function to clear expenses for the group (1 READ, 1 WRITE operation)
  const clearExpenses = async () => {
    const groupRef = doc(collection(db, "groups"), groupName);
    //READ
    const groupSnap = await getDoc(groupRef);
    const members = groupSnap.data().members;
    const newMembers = members.map((member) => {
      return {
        ...member,
        owe: 0,
      };
    });

    //WRITE
    await updateDoc(groupRef, { members: newMembers });

    setGroupMembers(newMembers);
  };

  /****************************************************** Item Functions ******************************************************/

  //function to add an item to the inventory (1 READ, 1 WRITE operation)
  const addItem = async () => {
    const groupRef = doc(collection(db, "groups"), groupName);

    const inventoryCollection = collection(groupRef, "inventories");

    const inventoryRef = doc(inventoryCollection, exampleInventory); //inventory should be dynamically selected

    //READ
    const inventorySnap = await getDoc(inventoryRef);

    if (!inventorySnap.exists()) {
      alert("Inventory does not exist");
      return;
    } else {
      const items = inventorySnap.data().items;

      const newItem = {
        name: itemName, // require user to give name
        quantity: quantity, //allow user to adjust quantity (default to 1)
        inventory: selectedInventory, // automatically selected based on the inventory selected
        unit: unit, // allow user to adjust unit (default to null)
        price: 0, // allow user to adjust price (default to 0)
        addedBy: userName, // automatically set to the user's full name
        Category: category, // allow user to adjust category (default to null)
        expiryDate: expiryDate, // allow  user to adjust expiry date (default to null)
        dateAdded: Date.now(), // default to time now
        lastUpdated: Date.now(), // default to date added
        isPerishable: isPerishable, // allow user to adjust (default to false)
        minimumQuantity: 0, // allow user to specify (default to 0)
        notes: notes, // allow user to add notes (default to empty string)
      };

      const newItems = [...items, newItem];
      //WRITE
      await updateDoc(inventoryRef, {
        items: newItems,
      });

      addExpense(newItem.price);
    }
    setItemName("");
    setQuantity(1);
    setSelectedInventory("");
    setUnit(null);
    setCategory(null);
    setExpiryDate(null);
    setIsPerishable(false);
    setNotes("");
  };

  //function to delete an item from the inventory (1 READ, 1 WRITE operation)
  const deleteItem = async () => {
    const groupRef = doc(collection(db, "groups"), groupName);
    const inventoryCollection = collection(groupRef, "inventories");

    const inventoryRef = doc(inventoryCollection, exampleInventory); //inventory should be dynamically selected

    //READ
    const inventorySnap = await getDoc(inventoryRef);

    if (!inventorySnap.exists()) {
      alert("Inventory does not exist");
      return;
    } else {
      const items = inventorySnap.data().items;

      const newItems = items.filter((item) => item.name !== itemName);
      //WRITE
      await updateDoc(inventoryRef, {
        neededItems: newItems,
      });
    }
    setItemName("");
  };

  /****************************************************** Needed Items Functions ******************************************************/

  //function to add a needed item to the inventory (1 READ, 1 WRITE operation)
  const addNeededItem = async () => {
    const groupRef = doc(collection(db, "groups"), groupName);
    const inventoryCollection = collection(groupRef, "inventories");

    const inventoryRef = doc(inventoryCollection, exampleInventory); //inventory should be dynamically selected

    //READ
    const inventorySnap = await getDoc(inventoryRef);

    if (!inventorySnap.exists()) {
      alert("Inventory does not exist");
      return;
    } else {
      const items = inventorySnap.data().neededItems;

      const newNeededItem = {
        name: itemName, // require user to give name
        quantityNeeded: 1, // allow user to adjust quantity (default to 1)
        unit: null, // allow user to adjust unit (default to null)
        inventory: exampleInventory, // automatically selected based on the inventory selected
        priority: "Low", // allow user to adjust priority (default to Low)
        assignTo: [`${user.firstName} ${user.lastName}`], // require user to assign to a roommate
        status: "Needed", // automatically set to Needed
        dateAdded: new Date(), // default to time now
        notes: "", // allow user to add notes (default to empty string)
      };

      const newItems = [...items, newNeededItem];
      //WRITE
      await updateDoc(inventoryRef, {
        neededItems: newItems,
      });
    }
    setItemName("");
  };

  //Modals open/close
  const handleOpenMemberModal = () => setOpenMemberModal(true);
  const handleCloseMemberModal = () => setOpenMemberModal(false);
  const handleOpenInventoryModal = () => setOpenNewInventoryModal(true);
  const handleCloseInventoryModal = () => setOpenNewInventoryModal(false);
  const handleOpenItemModal = () => setOpenAddItemModal(true);
  const handleCloseItemModal = () => setOpenAddItemModal(false);

  return (
    <Stack direction="column" alignItems="center" minHeight="100vh">
      {/* Welcome Statement */}
      <Stack direction="column" alignItems="center" width="100%" mt={8} mb={4}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          width="80%"
          height="200px"
          maxWidth="lg"
          position="relative"
          overflow="hidden"
          borderRadius="20px"
          mb={3}
        >
          <Image
            src={banner}
            alt="Roomventory banner"
            placeholder="blur"
            fill
            priority
            style={{
              objectFit: "cover",
              objectPosition: "center",
              filter: "blur(3px)",
            }}
          />
          <Box
            width="80%"
            maxWidth="lg"
            borderRadius="20px"
            position="absolute"
            p={3}
            bgcolor="rgba(78, 130, 107, 0.7)" // rgba for green_dark, needed opacity scale
          >
            <Typography
              textAlign="center"
              color={green_white}
              sx={{ typography: { xs: "h5", sm: "h4" } }}
            >
              Welcome *Name* to {groupName}
            </Typography>
          </Box>
        </Box>

        {/* Modal for creating new inventories */}
        <Modal open={openNewInventoryModal} onOpen={handleOpenInventoryModal}>
          <Box
            position="absolute"
            top="50%"
            left="50%"
            width={500}
            bgcolor={green_light}
            border="2px solid #000"
            p={2}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            gap={3}
            sx={{
              transform: "translate(-50%,-50%)",
            }}
          >
            <Typography variant="h5" textAlign="center">
              Create New Inventory
            </Typography>
            <Stack direction="row" spacing={2}>
              <Box bgcolor="white" border="1px solid black" borderRadius="5px">
                <TextField
                  placeholder="Ex. Bathroom, Kitchen"
                  border="1px solid black"
                  value={inventoryName}
                  onChange={(e) => setInventoryName(e.target.value)}
                />
              </Box>
              <Button
                variant="contained"
                sx={{
                  color: "white",
                  bgcolor: `${green_dark}`,
                  borderRadius: "10px",
                  transition: "200ms",
                  "&:hover": {
                    bgcolor: `${green_dark}`,
                    transform: "scale(1.1)",
                  },
                }}
                onClick={createInventory}
              >
                Create
              </Button>
            </Stack>
            <Button
              variant="contained"
              sx={{
                color: "white",
                bgcolor: `${green_dark}`,
                borderRadius: "10px",
                transition: "200ms",
                "&:hover": {
                  bgcolor: `${green_dark}`,
                  transform: "scale(1.1)",
                },
              }}
              onClick={() => {
                handleCloseInventoryModal();
              }}
            >
              Close
            </Button>
          </Box>
        </Modal>

        {/* Modal for adding new items */}
        <Modal open={openAddItemModal} onOpen={handleOpenItemModal}>
          <Box
            position="absolute"
            top="50%"
            left="50%"
            width={500}
            bgcolor={green_light}
            border="2px solid #000"
            p={2}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            gap={3}
            sx={{
              transform: "translate(-50%,-50%)",
            }}
          >
            <Typography variant="h5" textAlign="center">
              Add Item
            </Typography>
            <Stack direction="row" spacing={2}>
              <Box bgcolor="white" border="1px solid black" borderRadius="5px">
                <TextField
                  placeholder="Item Name"
                  border="1px solid black"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </Box>
              <Button
                variant="contained"
                sx={{
                  color: "white",
                  bgcolor: `${green_dark}`,
                  borderRadius: "10px",
                  transition: "200ms",
                  "&:hover": {
                    bgcolor: `${green_dark}`,
                    transform: "scale(1.1)",
                  },
                }}
                onClick={addItem}
              >
                Add
              </Button>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Box
                width="75px"
                bgcolor="white"
                border="1px solid black"
                borderRadius="5px"
              >
                <TextField
                  size="small"
                  placeholder="Qty."
                  border="1px solid black"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Box>
              <Box
                width="75px"
                bgcolor="white"
                border="1px solid black"
                borderRadius="5px"
              >
                <TextField
                  size="small"
                  placeholder="Unit"
                  border="1px solid black"
                  inputMode="numeric"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </Box>
              <Box
                width="100px"
                bgcolor="white"
                border="1px solid black"
                borderRadius="5px"
              >
                <TextField
                  size="small"
                  placeholder="Category"
                  border="1px solid black"
                  inputMode="numeric"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </Box>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl>
                <FormLabel textAlign="center">Perishable Item?</FormLabel>
                <RadioGroup
                  row
                  defaultValue="No"
                  value={isPerishable}
                  onChange={(e) => setIsPerishable(e.target.value)}
                >
                  <FormControlLabel
                    value={false}
                    control={<Radio size="small" />}
                    label="No"
                  />
                  <FormControlLabel
                    value={true}
                    control={<Radio size="small" />}
                    label="Yes"
                  />
                </RadioGroup>
              </FormControl>
              <Box
                height="100%"
                width="100px"
                bgcolor="white"
                border="1px solid black"
                borderRadius="5px"
              >
                <TextField
                  size="small"
                  placeholder="Exp. Date"
                  border="1px solid black"
                  inputMode="numeric"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </Box>
            </Stack>
            <Box bgcolor="white" color="black" width="150px">
              <FormControl fullWidth>
                <Select
                  size="small"
                  value={selectedInventory}
                  label="Inventory"
                  sx={{ color: "black" }}
                  onChange={(e) => setSelectedInventory(e.target.value)}
                >
                  {inventories.map((inventory) => (
                    <MenuItem value={inventory.name}>{inventory.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box bgcolor="white" width="60%">
              <TextField
                multiline
                fullWidth
                placeholder="Add notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Box>
            <Button
              variant="contained"
              sx={{
                color: "white",
                bgcolor: `${green_dark}`,
                borderRadius: "10px",
                transition: "200ms",
                "&:hover": {
                  bgcolor: `${green_dark}`,
                  transform: "scale(1.1)",
                },
              }}
              onClick={() => {
                handleCloseItemModal();
              }}
            >
              Close
            </Button>
          </Box>
        </Modal>

        <Stack width="80%" direction="row" spacing={2}>
          <Stack width="100%" direction="column" spacing={2}>
            {/* Search Bar */}
            <Box
              width="100%"
              maxWidth="md"
              maxHeight="90px"
              border="1px solid black"
              borderRadius="20px"
              p={2}
              sx={{
                background: `linear-gradient(to left, #fff, ${green_light})`,
              }}
            >
              <TextField
                fullWidth
                label="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment>
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Stack
              width="100%"
              direction="row"
              spacing={2}
              justifyContent="center"
            >
              <Button
                variant="contained"
                sx={{
                  color: "white",
                  bgcolor: `${green_dark}`,
                  borderRadius: "10px",
                  transition: "200ms",
                  "&:hover": {
                    bgcolor: `${green_dark}`,
                    transform: "scale(1.1)",
                  },
                }}
                onClick={(e) => {
                  handleOpenInventoryModal();
                }}
              >
                Create New Inventory
              </Button>
              <Button
                variant="contained"
                sx={{
                  color: "white",
                  bgcolor: `${green_dark}`,
                  borderRadius: "10px",
                  transition: "200ms",
                  "&:hover": {
                    bgcolor: `${green_dark}`,
                    transform: "scale(1.1)",
                  },
                }}
                onClick={(e) => {
                  handleOpenItemModal();
                }}
              >
                Add Item
              </Button>
            </Stack>
          </Stack>
          {/* Roommate Banner and Add Container Button */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            width="40%"
            maxWidth="lg"
            bgcolor={green_dark}
            borderRadius="20px"
            py={3}
            mb={2}
          >
            {/* invisible icon to balance out justifyContent space-between */}
            <SettingsIcon
              sx={{
                ml: 2,
                fontSize: { xs: 40, sm: 50 },
                color: `${green_dark}`,
              }}
            />
            <Box>
              <Typography
                flexGrow={1}
                textAlign="center"
                color={green_light}
                px={2}
                mb={2}
                sx={{ typography: { xs: "h5", sm: "h4" } }}
              >
                Roommates
              </Typography>
              <Stack direction="column" spacing={2}>
                {groupMembers.map((member) => (
                  <Typography textAlign="center" color="white">
                    {member.name}
                  </Typography>
                ))}
              </Stack>
            </Box>
            <SettingsIcon
              sx={{
                mr: 2,
                fontSize: { xs: 40, sm: 50 },
                color: `${green_light}`,
                transition: "200ms",
                "&:hover": {
                  transform: "rotate(180deg) scale(1.05)",
                },
              }}
              onClick={(e) => {
                handleOpenMemberModal();
              }}
            />
          </Stack>
        </Stack>
      </Stack>
      {/* Inventory Area */}
      <Box
        width="80%"
        maxWidth="xl"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        flexGrow={1}
      >
        {/* Modal for adding new members */}
        <Modal open={openMemberModal} onOpen={handleOpenMemberModal}>
          <Box
            position="absolute"
            top="50%"
            left="50%"
            width={500}
            bgcolor={green_light}
            border="2px solid #000"
            p={2}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            gap={3}
            sx={{
              transform: "translate(-50%,-50%)",
            }}
          >
            <Typography variant="h5" textAlign="center">
              Edit Group
            </Typography>
            <Stack direction="column" spacing={1}>
              {groupMembers.map((member) => (
                <Chip key={member} label={member} variant="filled" />
              ))}
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                placeholder="New Member Email"
                inputRef={textInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                variant="contained"
                sx={{
                  color: "white",
                  bgcolor: `${green_dark}`,
                  borderRadius: "10px",
                  transition: "200ms",
                  "&:hover": {
                    bgcolor: `${green_dark}`,
                    transform: "scale(1.1)",
                  },
                }}
                onClick={(e) => {
                  textInput.current.value = "";
                  handleInvite();
                }}
              >
                Invite
              </Button>
            </Stack>
            <Button
              variant="contained"
              sx={{
                color: "white",
                bgcolor: `${green_dark}`,
                borderRadius: "10px",
                transition: "200ms",
                "&:hover": {
                  bgcolor: `${green_dark}`,
                  transform: "scale(1.1)",
                },
              }}
              onClick={() => {
                handleCloseMemberModal();
              }}
            >
              Close
            </Button>
          </Box>
        </Modal>

        <Grid
          container
          spacing={2}
          mb={8}
          justifyContent={"center"}
          alignItems="center"
        >
          <Grid item xs={12} sm={12} md={12} lg={6} xl={6}>
            <Accordion>
              <AccordionSummary
                expandIcon={<ArrowDropDownIcon />}
                aria-controls="index number"
                id="index number"
                sx={{
                  border: "2px solid red",
                  width: "100%",
                  maxWidth: "100%",
                  textOverflow: "ellipsis",
                }}
              >
                {/* You can use inventory.name*/}
                <Typography
                  color="black"
                  textAlign="center"
                  border={"2px solid blue"}
                  width="100%"
                  sx={{ typography: { xs: "h6", sm: "h5" } }}
                >
                  Item List - {groupName}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack direction="column">
                  {/* below is an inventory item */}
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    borderRadius="15px"
                    position="relative"
                    mb={2}
                    sx={{
                      background: `linear-gradient(to bottom, ${green_light}, #fff)`,
                      "&::before": {
                        position: "absolute",
                        content: "''",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        background: `linear-gradient(to bottom, #fff, ${green_light})`,
                        transition: "opacity 200ms linear",
                        opacity: 0,
                        borderRadius: "15px",
                      },
                      "&:hover::before": {
                        opacity: 1,
                        zIndex: 1,
                        borderRadius: "15px",
                      },
                    }}
                  >
                    {/* You can use groupMembers here*/}
                    <Stack direction="column" zIndex={2}>
                      <Chip
                        label="Andrew"
                        variant="outlined"
                        size="small"
                        sx={{
                          ml: 1,
                          my: 1,
                          background: `linear-gradient(to bottom, lightblue, white)`,
                        }}
                      />
                      <Chip
                        label="Rafik"
                        variant="outlined"
                        size="small"
                        sx={{
                          ml: 1,
                          mb: 1,
                          background: `linear-gradient(to bottom, yellow, white)`,
                        }}
                      />
                    </Stack>
                    <Box zIndex={2}>
                      {/* You can use inventory.items.name here*/}
                      <Typography
                        sx={{
                          display: { xs: "block", sm: "inline" },
                          pr: { xs: 0, sm: 2, md: 3, lg: 3, xl: 4 },
                        }}
                      >
                        Name of item
                      </Typography>
                      {/* You can use inventory.items.quantity here*/}
                      <Typography
                        sx={{
                          display: { xs: "block", sm: "inline" },
                          pl: { xs: 0, sm: 2, md: 3, lg: 3, xl: 4 },
                        }}
                      >
                        # of item
                      </Typography>
                    </Box>
                    <Box zIndex={2}>
                      <TooltipIcon title="Delete" placement="top">
                        {/* You can use deleteItem here (probably pass item.name as parameter)*/}
                        <DeleteOutlineIcon />
                      </TooltipIcon>
                      <TooltipIcon title="-1" placement="top">
                        <RemoveIcon sx={{ mx: { xs: 1 } }} />
                      </TooltipIcon>
                      <TooltipIcon title="+1" placement="top">
                        <AddIcon sx={{ mr: 1 }} />
                      </TooltipIcon>
                    </Box>
                  </Stack>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
        <Box>
          <TextField
            label="input"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <Button onClick={addItem}>Add</Button>
        </Box>
      </Box>
    </Stack>
  );
}
