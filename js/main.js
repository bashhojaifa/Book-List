// Constants
const API_URL = "https://gutendex.com/books"; // API endpoint for fetching books
const BOOKS_PER_PAGE = 12; // Number of books to show per page
let currentPage = 1; // Current page in pagination
let currentSearch = ""; // Current search query input by the user
let currentGenre = ""; // Current selected genre filter

// DOM elements
const app = document.getElementById("app");
const bookList = document.getElementById("book-list");
const pagination = document.getElementById("pagination");
const searchInput = document.getElementById("search-input");
const genreFilter = document.getElementById("genre-filter");
const loadingSpinner = document.getElementById("loading-spinner");

// Initialize the app
init();

async function init() {
  loadPreferences(); // Load user preferences from localStorage before fetching books
  await fetchBooks(); // Fetch and display books
  setupEventListeners(); // Set up event listeners for UI interactions
}

function setupEventListeners() {
  // Handle realtime search input
  searchInput.addEventListener("input", handleSearchInput);

  // Handle genre filter change
  genreFilter.addEventListener("change", handleGenreFilter);

  // Handle page navigation (Home/Wishlist)
  document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", handleNavigation);
  });
}

var data = null; // Cache the fetched data, starts with null

// Fetch books from the API and update the UI
async function fetchBooks() {
  showLoadingSpinner(); // Show loading spinner during the fetch process
  try {
    if (!data) {
      const response = await fetch(
        `${API_URL}?page=${currentPage}&search=${currentSearch}&topic=${currentGenre.toLowerCase()}`
      );
      data = await response.json(); // Cache the fetched data
    }

    // If no books are found, display a message
    if (data.results.length === 0) {
      bookList.innerHTML = "<p>No books found</p>";
    } else {
      renderBooks(data.results); // Render the books
      renderPagination(data.count); // Render pagination
      updateGenreFilter(data.results); // Update genre filter options based on fetched books
    }
  } catch (error) {
    // Handle fetch error
    bookList.innerHTML = "<p>Error loading books. Please try again later.</p>";
  } finally {
    hideLoadingSpinner(); // Hide loading spinner after fetching
  }
}

// Render the list of books
function renderBooks(books) {
  bookList.innerHTML = ""; // Clear the previous list of books
  books.forEach((book) => {
    const bookCard = createBookCard(book); // Create a book card for each book
    bookList.appendChild(bookCard); // Append the card to the list
  });
}

// Create a card for each book
function createBookCard(book) {
  const card = document.createElement("div");
  card.className = "book-card"; // Assign a class to the card for styling
  card.innerHTML = `
    <img src="${book.formats["image/jpeg"] || "placeholder.jpg"}" alt="${
    book.title
  }">
  <p><b>ID:</b> ${book.id}</p>
    <h3>${truncateText(
      book.title,
      30
    )}</h3> <!-- Limit title to 30 characters -->
    <p><b>Author:</b> ${
      book.authors.length > 0
        ? book.authors.map((author) => author.name).join(", ")
        : "Unknown"
    }</p> <!-- Display all author names -->
    <p><b>Genre:</b> ${
      book.bookshelves.length > 0
        ? truncateText(book.bookshelves.join(", "), 50)
        : "N/A"
    }</p> <!-- Display all genres -->
    
    <button class="see-details-button">See Details</button> <!-- See Details Button -->
    <span class="wishlist-icon ${
      isWishlisted(book.id) ? "active" : ""
    }" data-id="${book.id}">❤</span> <!-- Wishlist icon with active state -->
  `;

  // Handle wishlist icon click
  card
    .querySelector(".wishlist-icon")
    .addEventListener("click", toggleWishlist);

  // Handle "See Details" button click
  card
    .querySelector(".see-details-button")
    .addEventListener("click", () => showBookDetails(book));

  return card;
}

// Truncate text to a maximum length
function truncateText(text, maxLength) {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

// Render pagination controls
function renderPagination(totalBooks) {
  const totalPages = Math.ceil(totalBooks / BOOKS_PER_PAGE); // Calculate total pages
  pagination.innerHTML = ""; // Clear previous pagination controls

  // Create previous button
  const prevButton = document.createElement("button");
  prevButton.textContent = "Previous";
  prevButton.disabled = currentPage === 1; // Disable if on the first page
  prevButton.addEventListener("click", () => changePage(currentPage - 1));
  pagination.appendChild(prevButton);

  // Set the number of page buttons to show
  const maxPagesToShow = window.innerWidth < 768 ? 3 : 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  // Adjust startPage if at the last page
  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  // Render individual page buttons
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    pageButton.disabled = i === currentPage; // Disable the current page button
    pageButton.addEventListener("click", () => changePage(i));
    pagination.appendChild(pageButton);
  }

  // Create next button
  const nextButton = document.createElement("button");
  nextButton.textContent = "Next";
  nextButton.disabled = currentPage === totalPages; // Disable if on the last page
  nextButton.addEventListener("click", () => changePage(currentPage + 1));
  pagination.appendChild(nextButton);
}

// Change the current page and re-fetch books
function changePage(newPage) {
  if (newPage !== currentPage) {
    currentPage = newPage; // Update the current page
    data = null; // Invalidate the cache
    fetchBooks(); // Fetch books for the new page
  }
}

// Handle search input (triggered on typing)
function handleSearchInput() {
  currentSearch = searchInput.value; // Update the search query
  currentPage = 1; // Reset to first page
  data = null; // Invalidate cache to fetch new results
  fetchBooks(); // Re-fetch books
  savePreferences(); // Save search preference
}

// Handle genre filter change
function handleGenreFilter() {
  currentGenre = genreFilter.value; // Update the genre filter
  currentPage = 1; // Reset to first page
  data = null; // Invalidate cache
  fetchBooks(); // Re-fetch books
  savePreferences(); // Save genre preference
}

// Update the genre filter options based on the fetched books
function updateGenreFilter(books) {
  const genres = new Set(); // Use Set to ensure unique genres
  books.forEach((book) => {
    book.bookshelves.forEach((genre) => genres.add(genre)); // Add book genres to the Set
  });

  const previousGenre = currentGenre || ""; // Store current genre

  // Reset the genre filter options
  genreFilter.innerHTML = '<option value="">All Genres</option>';
  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    genreFilter.appendChild(option);
  });

  // Re-apply the user's selected genre after updating
  genreFilter.value = previousGenre;
}

// Toggle the book in the wishlist
function toggleWishlist(event) {
  event.stopPropagation();
  const bookId = event.target.dataset.id; // Get the book ID
  const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]"); // Load the wishlist
  const index = wishlist.indexOf(bookId); // Find if the book is already in the wishlist

  if (index === -1) {
    // Add to wishlist if not present
    wishlist.push(bookId);
    event.target.classList.add("active"); // Activate wishlist icon
  } else {
    // Remove from wishlist if already present
    wishlist.splice(index, 1);
    event.target.classList.remove("active"); // Deactivate wishlist icon
  }

  // Save the updated wishlist
  localStorage.setItem("wishlist", JSON.stringify(wishlist));
}

// Check if the book is in the wishlist
function isWishlisted(bookId) {
  const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
  return wishlist.includes(bookId.toString()); // Return true if book is in wishlist
}

// Show detailed modal for a selected book
function showBookDetails(book) {
  const bookDetailsModal = document.getElementById("book-details");
  const bookDetailsContent = document.getElementById("book-details-content");
  const bookDetailsImage = document.getElementById("book-details-image");

  // Update modal content with the book details
  bookDetailsImage.src = book.formats["image/jpeg"] || "placeholder.jpg";
  bookDetailsContent.innerHTML = `
    <h2>${book.title}</h2>
    <p><strong>ID:</strong> ${book.id}</p>  
    <p><strong>Author:</strong> ${book.authors[0]?.name || "Unknown"}</p>
    <p><strong>Genre:</strong> ${book.bookshelves.join(", ") || "N/A"}</p>
    <p><strong>Subjects:</strong> ${book.subjects.join(", ") || "N/A"}</p>
  `;

  // Show the modal
  bookDetailsModal.classList.remove("hidden");

  // Close modal on clicking close button
  document.querySelector(".close-button").addEventListener("click", closeModal);
}

// Close the modal
function closeModal() {
  const bookDetailsModal = document.getElementById("book-details");
  bookDetailsModal.classList.add("hidden"); // Hide the modal
}

// Handle navigation between Home and Wishlist pages
function handleNavigation(event) {
  event.preventDefault(); // Prevent default link behavior
  const page = event.target.dataset.page; // Get the target page
  if (page === "home") {
    showHomePage(); // Show the Home page
  } else if (page === "wishlist") {
    showWishlistPage(); // Show the Wishlist page
  }
}

// Display the Home page
function showHomePage() {
  app.classList.remove("hidden"); // Show main content
  document.getElementById("book-details").classList.add("hidden"); // Hide details modal

  // Show search and pagination controls
  document.getElementById("search-container").classList.remove("hidden");
  document.getElementById("pagination").classList.remove("hidden");

  fetchBooks(); // Fetch books for the home page
}

// Display the Wishlist page
async function showWishlistPage() {
  showLoadingSpinner(); // Show loading spinner

  // Hide search and pagination controls
  document.getElementById("search-container").classList.add("hidden");
  document.getElementById("pagination").classList.add("hidden");

  const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]"); // Load wishlist
  bookList.innerHTML = ""; // Clear the current book list

  const booksToDisplay = []; // Array to store wishlist books

  // First, check if the book is in the cached data
  if (data && Array.isArray(data.results)) {
    wishlist.forEach((bookId) => {
      const book = data.results.find((b) => b.id.toString() === bookId);
      if (book) {
        booksToDisplay.push(book);
      }
    });
  }

  // Fetch missing books by ID from the API if not in the cache
  for (const bookId of wishlist) {
    if (!booksToDisplay.some((b) => b.id.toString() === bookId)) {
      try {
        const response = await fetch(`${API_URL}?ids=${bookId}`);
        const fetchedData = await response.json();
        if (fetchedData.results && fetchedData.results.length > 0) {
          booksToDisplay.push(fetchedData.results[0]);
        }
      } catch (error) {
        console.error("Error fetching book by ID:", error);
      }
    }
  }

  // Render the wishlist books
  if (booksToDisplay.length === 0) {
    bookList.innerHTML = "<p>No books in your wishlist.</p>";
  } else {
    booksToDisplay.forEach((book) => {
      const bookCard = createBookCard(book);
      bookList.appendChild(bookCard);
    });
  }

  hideLoadingSpinner(); // Hide loading spinner
}

// Save user preferences (search and genre) to localStorage
function savePreferences() {
  localStorage.setItem("searchPreference", currentSearch); // Save search query
  localStorage.setItem("genrePreference", currentGenre); // Save selected genre
}

// Load user preferences from localStorage
function loadPreferences() {
  currentSearch = localStorage.getItem("searchPreference") || ""; // Load saved search
  currentGenre = localStorage.getItem("genrePreference") || ""; // Load saved genre

  // Set the input fields with loaded preferences
  searchInput.value = currentSearch;
  genreFilter.value = currentGenre;
}

// Show loading spinner
function showLoadingSpinner() {
  loadingSpinner.classList.remove("hidden");
}

// Hide loading spinner
function hideLoadingSpinner() {
  loadingSpinner.classList.add("hidden");
}
